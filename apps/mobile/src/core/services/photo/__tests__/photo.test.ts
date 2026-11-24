import { launchCameraAsync, launchImageLibraryAsync } from 'expo-image-picker';

import { capturePhoto, deletePatientPhoto } from '../photo';
import { PHOTO_DIRECTORY, PHOTO_QUALITY } from '../constants';

// A tiny in-memory filesystem. `mockExistingUris` is what the tests drive:
// anything in it reports `exists`, and `delete()` removes it. Both classes
// record their instances so a test can assert on the copy target without
// having to reach through the module.
const mockExistingUris = new Set<string>();
const mockFiles: MockFile[] = [];
const mockDirectories: MockDirectory[] = [];

class MockFile {
  uri: string;
  delete = jest.fn(() => {
    mockExistingUris.delete(this.uri);
  });
  copy = jest.fn();

  constructor(...parts: unknown[]) {
    this.uri = parts.map(String).join('/');
    mockFiles.push(this);
  }

  get exists(): boolean {
    return mockExistingUris.has(this.uri);
  }
}

class MockDirectory {
  uri: string;
  create = jest.fn(() => {
    mockExistingUris.add(this.uri);
  });

  constructor(...parts: unknown[]) {
    this.uri = parts.map(String).join('/');
    mockDirectories.push(this);
  }

  get exists(): boolean {
    return mockExistingUris.has(this.uri);
  }
}

jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///document' },
  File: jest.fn((...parts: unknown[]) => new MockFile(...parts)),
  Directory: jest.fn((...parts: unknown[]) => new MockDirectory(...parts)),
}));

jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@/core/utils/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn() },
}));

const PATIENT_UUID = '6f3c1b2a-0d5e-4a87-9c11-2b7f8e4d6a30';
const DIRECTORY_URI = `file:///document/${PHOTO_DIRECTORY}`;
const TARGET_URI = `${DIRECTORY_URI}/${PATIENT_UUID}.jpg`;

const camera = launchCameraAsync as jest.MockedFunction<typeof launchCameraAsync>;
const gallery = launchImageLibraryAsync as jest.MockedFunction<typeof launchImageLibraryAsync>;

/** What the picker returns when the user actually picked something. */
function picked(uri: string) {
  return { canceled: false as const, assets: [{ uri }] };
}

function cancelled() {
  return { canceled: true as const, assets: null };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockExistingUris.clear();
  mockFiles.length = 0;
  mockDirectories.length = 0;
});

describe('capturePhoto', () => {
  it('returns the patient-named target uri, not the picker\'s own uri', async () => {
    camera.mockResolvedValue(picked('file:///cache/IMG_8812.jpg') as never);

    const result = await capturePhoto('camera', PATIENT_UUID);

    // The whole point of the service owning the path: callers get a stable
    // name derived from the uuid, never the picker's temporary location.
    expect(result).toBe(TARGET_URI);
  });

  it('copies the picked file to the target', async () => {
    camera.mockResolvedValue(picked('file:///cache/IMG_8812.jpg') as never);

    await capturePhoto('camera', PATIENT_UUID);

    const source = mockFiles.find((f) => f.uri === 'file:///cache/IMG_8812.jpg');
    expect(source?.copy).toHaveBeenCalledTimes(1);
  });

  it('opens the gallery, not the camera, for the gallery source', async () => {
    gallery.mockResolvedValue(picked('file:///cache/pick.jpg') as never);

    await capturePhoto('gallery', PATIENT_UUID);

    expect(gallery).toHaveBeenCalledTimes(1);
    expect(camera).not.toHaveBeenCalled();
  });

  it('asks for full quality', async () => {
    camera.mockResolvedValue(picked('file:///cache/a.jpg') as never);

    await capturePhoto('camera', PATIENT_UUID);

    expect(camera).toHaveBeenCalledWith({ quality: PHOTO_QUALITY });
  });

  it('returns null when the user cancels, and copies nothing', async () => {
    camera.mockResolvedValue(cancelled() as never);

    const result = await capturePhoto('camera', PATIENT_UUID);

    // A cancel is not an error and must leave any existing photo alone.
    expect(result).toBeNull();
    expect(mockFiles.every((f) => f.copy.mock.calls.length === 0)).toBe(true);
  });

  it('returns null when the picker reports success but hands back nothing', async () => {
    camera.mockResolvedValue({ canceled: false, assets: [] } as never);

    await expect(capturePhoto('camera', PATIENT_UUID)).resolves.toBeNull();
  });

  it('creates the photo directory when it does not exist', async () => {
    camera.mockResolvedValue(picked('file:///cache/a.jpg') as never);

    await capturePhoto('camera', PATIENT_UUID);

    const directory = mockDirectories.find((d) => d.uri === DIRECTORY_URI);
    expect(directory?.create).toHaveBeenCalledTimes(1);
  });

  it('does not re-create the directory when it is already there', async () => {
    mockExistingUris.add(DIRECTORY_URI);
    camera.mockResolvedValue(picked('file:///cache/a.jpg') as never);

    await capturePhoto('camera', PATIENT_UUID);

    const directory = mockDirectories.find((d) => d.uri === DIRECTORY_URI);
    expect(directory?.create).not.toHaveBeenCalled();
  });

  it('deletes the previous photo before copying, so a retake really replaces it', async () => {
    mockExistingUris.add(DIRECTORY_URI);
    mockExistingUris.add(TARGET_URI);
    camera.mockResolvedValue(picked('file:///cache/second.jpg') as never);

    await capturePhoto('camera', PATIENT_UUID);

    // `copy` onto an existing file is not defined to replace it, so without
    // this the first photo survives and the field points at the old one.
    const target = mockFiles.find((f) => f.uri === TARGET_URI);
    expect(target?.delete).toHaveBeenCalledTimes(1);
  });
});

describe('deletePatientPhoto', () => {
  it('deletes the patient photo when there is one', async () => {
    mockExistingUris.add(TARGET_URI);

    await deletePatientPhoto(PATIENT_UUID);

    const target = mockFiles.find((f) => f.uri === TARGET_URI);
    expect(target?.delete).toHaveBeenCalledTimes(1);
  });

  it('does nothing when there is no photo', async () => {
    await deletePatientPhoto(PATIENT_UUID);

    const target = mockFiles.find((f) => f.uri === TARGET_URI);
    expect(target?.delete).not.toHaveBeenCalled();
  });

  it('resolves even when the delete throws', async () => {
    mockExistingUris.add(TARGET_URI);
    const throwingFile = {
      uri: TARGET_URI,
      get exists() {
        return true;
      },
      delete: jest.fn(() => {
        throw new Error('EBUSY');
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('expo-file-system') as { File: jest.Mock };
    fs.File.mockImplementationOnce(() => throwingFile);

    // Best effort by design: a locked file must not trap the user on a form
    // they asked to leave.
    await expect(deletePatientPhoto(PATIENT_UUID)).resolves.toBeUndefined();
    expect(throwingFile.delete).toHaveBeenCalled();
  });
});

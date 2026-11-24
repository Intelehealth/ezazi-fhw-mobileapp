import '@/core/i18n';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PhotoSourceDialog } from '../PhotoSourceDialog';

const onSelect = jest.fn();
const onClose = jest.fn();

function renderDialog(visible = true) {
  return render(
    <PhotoSourceDialog
      visible={visible}
      title="Add a picture"
      cameraLabel="Camera"
      galleryLabel="Gallery"
      cancelLabel="Cancel"
      onSelect={onSelect}
      onClose={onClose}
    />,
  );
}

describe('PhotoSourceDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title, both sources and Cancel', () => {
    renderDialog();

    expect(screen.getByText('Add a picture')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Camera' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Gallery' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('reports camera and gallery as the source the caller passes on', () => {
    renderDialog();

    fireEvent.press(screen.getByRole('button', { name: 'Camera' }));
    expect(onSelect).toHaveBeenCalledWith('camera');

    fireEvent.press(screen.getByRole('button', { name: 'Gallery' }));
    expect(onSelect).toHaveBeenCalledWith('gallery');
  });

  // The caller closes once the capture resolves, so the chooser is not left
  // behind a half-finished camera.
  it('does not close itself when a source is chosen', () => {
    renderDialog();

    fireEvent.press(screen.getByRole('button', { name: 'Camera' }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Cancel without reporting a source', () => {
    renderDialog();

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders nothing while it is not visible', () => {
    renderDialog(false);

    expect(screen.queryByText('Add a picture')).toBeNull();
  });
});

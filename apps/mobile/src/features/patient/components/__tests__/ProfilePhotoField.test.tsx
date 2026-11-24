import '@/core/i18n';
import { Image } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ProfilePhotoField } from '../ProfilePhotoField';

const onPress = jest.fn();

describe('ProfilePhotoField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the caption and opens the chooser when tapped', () => {
    render(<ProfilePhotoField onPress={onPress} />);

    expect(screen.getByText('Add a picture')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Add a picture' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // The empty state is the registry's `person` glyph, so there is no Image
  // until a capture resolves.
  it('shows no photo until one is captured', () => {
    render(<ProfilePhotoField onPress={onPress} />);

    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  });

  it('renders the captured file once a path is set', () => {
    render(
      <ProfilePhotoField
        onPress={onPress}
        photoPath="file:///patient-photos/abc.jpg"
      />,
    );

    const photo = screen.UNSAFE_getByType(Image);
    expect(photo.props.source).toEqual({ uri: 'file:///patient-photos/abc.jpg' });
  });

  // Tapping again replaces; the frame has no remove control and nor does the
  // legacy, so there must be no second button here.
  it('offers no way to remove a photo once taken', () => {
    render(<ProfilePhotoField onPress={onPress} photoPath="file:///a.jpg" />);

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});

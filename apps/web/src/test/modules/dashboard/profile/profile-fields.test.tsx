import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userIcon from '../../../../assets/svgs/user.svg';
import {
  ProfilePhotoCard,
  computeAge,
} from '../../../../modules/dashboard/profile/profile-fields';

describe('ProfilePhotoCard', () => {
  it('shows the given photo and name', () => {
    const { container } = render(
      <ProfilePhotoCard
        photoUrl="/personimage/per-1"
        name="Demo Nurse"
        onPhotoChange={vi.fn()}
        uploading={false}
      />
    );

    expect(screen.getByText('Demo Nurse')).toBeInTheDocument();
    expect(container.querySelector('img.rounded-full')).toHaveAttribute(
      'src',
      '/personimage/per-1'
    );
  });

  it('falls back to the user icon when there is no photo, or when it fails to load', () => {
    const { container } = render(
      <ProfilePhotoCard
        photoUrl={null}
        name="Demo Nurse"
        onPhotoChange={vi.fn()}
        uploading={false}
      />
    );
    const photo = container.querySelector(
      'img.rounded-full'
    ) as HTMLImageElement;
    expect(photo.src).toBe(new URL(userIcon, window.location.href).href);

    photo.src = '/broken.jpg';
    fireEvent.error(photo);
    expect(photo.src).toBe(new URL(userIcon, window.location.href).href);
  });

  it('reports a chosen file and disables the picker while uploading', () => {
    const onPhotoChange = vi.fn();
    const { container, rerender } = render(
      <ProfilePhotoCard
        photoUrl={null}
        name="Demo Nurse"
        onPhotoChange={onPhotoChange}
        uploading={false}
      />
    );
    const input = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [new File(['x'], 'p.jpg', { type: 'image/jpeg' })] },
    });
    expect(onPhotoChange).toHaveBeenCalledTimes(1);
    expect(input).toBeEnabled();

    rerender(
      <ProfilePhotoCard
        photoUrl={null}
        name="Demo Nurse"
        onPhotoChange={onPhotoChange}
        uploading
      />
    );
    expect(input).toBeDisabled();
  });
});

describe('computeAge', () => {
  it('returns an empty string for a blank or unparseable birthdate', () => {
    expect(computeAge('')).toBe('');
    expect(computeAge('not-a-date')).toBe('');
  });

  it("counts whole years, only after this year's birthday has passed", () => {
    const today = new Date();
    const iso = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const birthdayToday = new Date(today);
    birthdayToday.setFullYear(today.getFullYear() - 30);
    expect(computeAge(iso(birthdayToday))).toBe('30');

    const birthdayTomorrow = new Date(today);
    birthdayTomorrow.setFullYear(today.getFullYear() - 30);
    birthdayTomorrow.setDate(today.getDate() + 1);
    expect(computeAge(iso(birthdayTomorrow))).toBe('29');
  });
});

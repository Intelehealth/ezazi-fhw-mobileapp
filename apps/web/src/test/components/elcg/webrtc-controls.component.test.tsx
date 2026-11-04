import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WebrtcControlsComponent } from '../../../components/elcg/webrtc-controls.component';

describe('WebrtcControlsComponent', () => {
  it('starts a video call or a chat from its buttons', async () => {
    const onStartCall = vi.fn();
    const onStartChat = vi.fn();
    render(
      <WebrtcControlsComponent
        onStartCall={onStartCall}
        onStartChat={onStartChat}
      />
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Start video call' })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Start chat' }));

    expect(onStartCall).toHaveBeenCalledTimes(1);
    expect(onStartChat).toHaveBeenCalledTimes(1);
  });
});

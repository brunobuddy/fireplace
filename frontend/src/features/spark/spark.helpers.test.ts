import { describe, expect, it } from 'vitest';
import type { SparkParticipantView, SparkView } from '@/lib/types';
import {
  deriveSparkPhase,
  hasUnrevealedAnswers,
  partnerSlot,
  viewerSlot,
} from './spark.helpers';

const slot = (over: Partial<SparkParticipantView>): SparkParticipantView => ({
  memberId: 'm',
  name: 'X',
  color: '#fff',
  hasAnswered: false,
  answeredAt: null,
  text: null,
  isViewer: false,
  ...over,
});

const view = (over: Partial<SparkView> = {}): SparkView => ({
  question: { id: 'q1', text: 'Q?', createdAt: '2026-05-23T10:00:00.000Z' },
  participants: [
    slot({ memberId: 'me', isViewer: true }),
    slot({ memberId: 'partner' }),
  ],
  revealed: false,
  viewerIsParticipant: true,
  viewerHasAnswered: false,
  ...over,
});

describe('deriveSparkPhase', () => {
  it('is empty without a view or question', () => {
    expect(deriveSparkPhase(null)).toBe('empty');
    expect(deriveSparkPhase(view({ question: null }))).toBe('empty');
  });

  it('is answering for a parent who has not answered', () => {
    expect(deriveSparkPhase(view())).toBe('answering');
  });

  it('is waiting for a parent who answered but is not revealed', () => {
    expect(deriveSparkPhase(view({ viewerHasAnswered: true }))).toBe('waiting');
  });

  it('is revealed once both have answered', () => {
    expect(
      deriveSparkPhase(view({ revealed: true, viewerHasAnswered: true })),
    ).toBe('revealed');
  });

  it('is spectator for a non-participant', () => {
    expect(deriveSparkPhase(view({ viewerIsParticipant: false }))).toBe(
      'spectator',
    );
  });
});

describe('viewerSlot / partnerSlot', () => {
  it('finds the viewer and the partner', () => {
    const v = view();
    expect(viewerSlot(v)?.memberId).toBe('me');
    expect(partnerSlot(v)?.memberId).toBe('partner');
  });

  it('tolerates a null/undefined view', () => {
    expect(viewerSlot(null)).toBeUndefined();
    expect(partnerSlot(undefined)).toBeUndefined();
  });
});

describe('hasUnrevealedAnswers', () => {
  it('is true when someone answered but it is not revealed', () => {
    const v = view({
      participants: [
        slot({ memberId: 'me', isViewer: true, hasAnswered: true }),
        slot({ memberId: 'partner' }),
      ],
    });
    expect(hasUnrevealedAnswers(v)).toBe(true);
  });

  it('is false when revealed', () => {
    expect(
      hasUnrevealedAnswers(
        view({ revealed: true, participants: [slot({ hasAnswered: true })] }),
      ),
    ).toBe(false);
  });

  it('is false when nobody has answered', () => {
    expect(hasUnrevealedAnswers(view())).toBe(false);
  });
});

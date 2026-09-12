import { useEffect } from 'react';
import { SectionHeader } from './ui/primitives';
import { Icon, type IconName } from './ui/Icon';
import { buildWhatsAppFeedbackUrl, isFeedbackConfigured, type FeedbackType } from '../lib/feedback/whatsapp';
import { track } from '../lib/track';

const CATEGORIES: { type: FeedbackType; label: string; icon: IconName }[] = [
  { type: 'bug', label: 'Report a problem', icon: 'bug' },
  { type: 'idea', label: 'Suggest an idea', icon: 'idea' },
  { type: 'general', label: 'General feedback', icon: 'heart' },
];

/**
 * Help & Feedback (docs/ANALYTICS_FEEDBACK_PLAN.md §9/§10/§22) — deliberately three
 * plain rows, not a support-ticket system. Each tap opens WhatsApp with a pre-filled,
 * user-editable message (`lib/feedback/whatsapp.ts`) — nothing is ever sent
 * automatically, and the footnote below says so explicitly (spec §10).
 *
 * Renders nothing at all if `VITE_WHATSAPP_NUMBER` isn't configured — same
 * "unconfigured = safe no-op, never a dead link" posture as every other optional piece
 * of this app (spec §29).
 */
export function HelpFeedback() {
  useEffect(() => {
    if (isFeedbackConfigured) track('feedback_opened');
  }, []);

  if (!isFeedbackConfigured) return null;

  return (
    <section>
      <SectionHeader title="Help & Feedback" sub="Tell us what's working, and what's not" />
      <div className="z-card divide-y divide-line">
        {CATEGORIES.map(({ type, label, icon }) => (
          <a
            key={type}
            href={buildWhatsAppFeedbackUrl(type, window.location.pathname) ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              track('feedback_category_selected', { feedback_type: type });
              // Means "the user clicked the WhatsApp action," not "the message was sent"
              // — spec §12 is explicit that these are different claims. The user still
              // has to review and send it themselves in WhatsApp.
              track('feedback_submitted', { feedback_type: type, source: 'profile' });
            }}
            className="px-4 py-3 flex items-center gap-3 text-sm font-semibold hover:text-brand"
          >
            <Icon name={icon} size={19} className="text-brand shrink-0" />
            {label}
          </a>
        ))}
      </div>
      <p className="text-2xs text-content-faint px-1 mt-1.5">
        Opens WhatsApp with a pre-filled message you can edit — nothing sends until you do.
      </p>
    </section>
  );
}

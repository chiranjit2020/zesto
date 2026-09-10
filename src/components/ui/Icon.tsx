import type { ComponentType } from 'react';
import {
  ChefHat, Coins, BatteryLow, Moon, Recycle, FlaskConical, CalendarDays, Dices,
  Home as HomeI, Compass, ShoppingBasket, User, Utensils, Sparkles, Clock, Flame,
  Wallet, Timer, Search, ShoppingCart, PiggyBank, Ban, Hash, Egg, Soup, Salad,
  Croissant, Refrigerator, Lightbulb, PartyPopper, Repeat2, TrendingUp, Flame as Streak,
  Microwave, CookingPot, Coffee, Sandwich, EggFried, Disc, Soup as SoupPot,
  ArrowRight, ArrowLeft, Star, Shuffle, ListChecks, X, Check, Circle, Plus,
  type LucideProps,
} from 'lucide-react';

/**
 * One registry: semantic name → Lucide icon. Replaces the emoji throughout the app with
 * a single consistent (MIT-licensed) set. `motion` adds a subtle, reduced-motion-safe
 * animation — a plain-static icon reads as decoration; a hint of life reads as a control.
 */
const REGISTRY = {
  // situational modes
  'mode-make': Utensils,
  'mode-broke': Coins,
  'mode-tired': BatteryLow,
  'mode-midnight': Moon,
  'mode-leftovers': Recycle,
  'mode-improvise': FlaskConical,
  'mode-plan': CalendarDays,
  'mode-surprise': Dices,
  // nav
  'nav-home': HomeI,
  'nav-discover': Compass,
  'nav-pantry': ShoppingBasket,
  'nav-planner': CalendarDays,
  'nav-profile': User,
  // ui / states
  cook: ChefHat,
  sparkle: Sparkles,
  time: Clock,
  calories: Flame,
  money: Wallet,
  timer: Timer,
  search: Search,
  cart: ShoppingCart,
  saved: PiggyBank,
  streak: Streak,
  insight: Lightbulb,
  celebrate: PartyPopper,
  reuse: Repeat2,
  trend: TrendingUp,
  fridge: Refrigerator,
  ban: Ban,
  hash: Hash,
  // chapters / food
  egg: Egg,
  soup: Soup,
  salad: Salad,
  pastry: Croissant,
  // equipment
  'eq-no-cook': Sandwich,
  'eq-kettle': Coffee,
  'eq-microwave': Microwave,
  'eq-one-pan': EggFried,
  'eq-one-pot': CookingPot,
  'eq-tawa': Disc,
  'eq-rice-cooker': SoupPot,
  // misc controls
  next: ArrowRight,
  back: ArrowLeft,
  close: X,
  check: Check,
  bullet: Circle,
  plus: Plus,
  star: Star,
  shuffle: Shuffle,
  checklist: ListChecks,
} satisfies Record<string, ComponentType<LucideProps>>;

export type IconName = keyof typeof REGISTRY;

type Motion = 'none' | 'pop' | 'spin' | 'swing' | 'pulse' | 'breathe' | 'tumble';

const MOTION_CLASS: Record<Motion, string> = {
  none: '',
  pop: 'zi-pop',
  spin: 'zi-spin',
  swing: 'zi-swing',
  pulse: 'zi-pulse',
  breathe: 'zi-breathe',
  tumble: 'zi-tumble',
};

/** the signature animation for each situational mode */
export const MODE_MOTION: Record<string, Motion> = {
  'mode-make': 'pop',
  'mode-broke': 'swing',
  'mode-tired': 'pulse',
  'mode-midnight': 'breathe',
  'mode-leftovers': 'spin',
  'mode-improvise': 'pop',
  'mode-plan': 'pop',
  'mode-surprise': 'tumble',
};

export function Icon({
  name,
  size = 22,
  strokeWidth = 2,
  motion = 'none',
  className = '',
  ...rest
}: { name: IconName; motion?: Motion } & LucideProps) {
  const Cmp = REGISTRY[name];
  return (
    <Cmp
      size={size}
      strokeWidth={strokeWidth}
      className={`${MOTION_CLASS[motion]} ${className}`}
      aria-hidden
      {...rest}
    />
  );
}

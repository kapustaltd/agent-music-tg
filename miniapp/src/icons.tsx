import type { LucideIcon, LucideProps } from "lucide-react";
import {
  AlignLeft as LucideAlignLeft,
  ArrowLeft as LucideArrowLeft,
  ArrowRight as LucideArrowRight,
  ArrowUp as LucideArrowUp,
  Ban as LucideBan,
  Bookmark as LucideBookmark,
  Calendar as LucideCalendar,
  ChartBar as LucideChartBar,
  Check as LucideCheck,
  ChevronDown as LucideChevronDown,
  ChevronRight as LucideChevronRight,
  ChevronUp as LucideChevronUp,
  Circle as LucideCircle,
  CircleAlert as LucideCircleAlert,
  CircleCheck as LucideCircleCheck,
  CircleHelp as LucideCircleHelp,
  CirclePlay as LucideCirclePlay,
  CircleUserRound as LucideCircleUserRound,
  CircleX as LucideCircleX,
  Copy as LucideCopy,
  CreditCard as LucideCreditCard,
  Crown as LucideCrown,
  Download as LucideDownload,
  EllipsisVertical as LucideEllipsisVertical,
  Eye as LucideEye,
  ExternalLink as LucideExternalLink,
  Gift as LucideGift,
  Gauge as LucideGauge,
  Heart as LucideHeart,
  Key as LucideKey,
  Landmark as LucideLandmark,
  LifeBuoy as LucideLifeBuoy,
  Link2Off as LucideLink2Off,
  ListMusic as LucideListMusic,
  ListPlus as LucideListPlus,
  ListVideo as LucideListVideo,
  LoaderCircle as LucideLoaderCircle,
  MessageCircle as LucideMessageCircle,
  Minus as LucideMinus,
  Music as LucideMusic,
  Music2 as LucideMusic2,
  Package as LucidePackage,
  Paperclip as LucidePaperclip,
  Pause as LucidePause,
  Pencil as LucidePencil,
  Play as LucidePlay,
  Plus as LucidePlus,
  Receipt as LucideReceipt,
  RefreshCw as LucideRefreshCw,
  Search as LucideSearch,
  Send as LucideSend,
  Share2 as LucideShare2,
  Shield as LucideShield,
  SkipBack as LucideSkipBack,
  SkipForward as LucideSkipForward,
  SlidersHorizontal as LucideSlidersHorizontal,
  Sparkles as LucideSparkles,
  Star as LucideStar,
  Store as LucideStore,
  ThumbsDown as LucideThumbsDown,
  Trash as LucideTrash,
  User as LucideUser,
  UsersRound as LucideUsersRound,
  Volume1 as LucideVolume1,
  Volume2 as LucideVolume2,
  VolumeX as LucideVolumeX,
  Wallet as LucideWallet,
  X as LucideX,
} from "lucide-react";

/**
 * Existing components can keep their current size and aria props while the
 * rendered SVGs come from Lucide. Phosphor's `weight` is translated to a
 * slightly heavier Lucide stroke; Lucide remains stroke-based throughout.
 */
type LegacyWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
type IconProps = LucideProps & { weight?: LegacyWeight };

function icon(Icon: LucideIcon) {
  return function CompatibleIcon({ weight, ...props }: IconProps) {
    const strokeWidth = props.strokeWidth ?? (weight === "bold" || weight === "fill" ? 2.25 : 2);
    return <Icon {...props} strokeWidth={strokeWidth} />;
  };
}

export const AlignLeft = icon(LucideAlignLeft);
export const ArrowLeft = icon(LucideArrowLeft);
export const ArrowRight = icon(LucideArrowRight);
export const ArrowSquareOut = icon(LucideExternalLink);
export const ArrowUp = icon(LucideArrowUp);
export const ArrowsClockwise = icon(LucideRefreshCw);
export const Bank = icon(LucideLandmark);
export const BookmarkSimple = icon(LucideBookmark);
export const Calendar = icon(LucideCalendar);
export const CaretDown = icon(LucideChevronDown);
export const CaretRight = icon(LucideChevronRight);
export const CaretRightIcon = CaretRight;
export const CaretUp = icon(LucideChevronUp);
export const ChartBar = icon(LucideChartBar);
export const ChatCircle = icon(LucideMessageCircle);
export const Check = icon(LucideCheck);
export const CheckCircle = icon(LucideCircleCheck);
export const Circle = icon(LucideCircle);
export const CircleNotch = icon(LucideLoaderCircle);
export const Copy = icon(LucideCopy);
export const CreditCard = icon(LucideCreditCard);
export const Crown = icon(LucideCrown);
export const DotsThreeVertical = icon(LucideEllipsisVertical);
export const DownloadSimple = icon(LucideDownload);
export const Eye = icon(LucideEye);
export const Gift = icon(LucideGift);
export const Gauge = icon(LucideGauge);
export const HeartStraight = icon(LucideHeart);
export const Key = icon(LucideKey);
export const Lifebuoy = icon(LucideLifeBuoy);
export const LinkBreak = icon(LucideLink2Off);
export const ListPlus = icon(LucideListPlus);
export const MagnifyingGlass = icon(LucideSearch);
export const Minus = icon(LucideMinus);
export const MusicNotes = icon(LucideMusic2);
export const MusicNotesPlus = icon(LucideListMusic);
export const MusicNotesSimple = icon(LucideMusic);
export const Package = icon(LucidePackage);
export const Paperclip = icon(LucidePaperclip);
export const PaperPlaneTilt = icon(LucideSend);
export const Pause = icon(LucidePause);
export const PencilSimple = icon(LucidePencil);
export const Play = icon(LucidePlay);
export const PlayCircle = icon(LucideCirclePlay);
export const Plus = icon(LucidePlus);
export const Playlist = icon(LucideListMusic);
export const Prohibit = icon(LucideBan);
export const Question = icon(LucideCircleHelp);
export const Queue = icon(LucideListVideo);
export const Receipt = icon(LucideReceipt);
export const ShareNetwork = icon(LucideShare2);
export const Shield = icon(LucideShield);
export const SkipBack = icon(LucideSkipBack);
export const SkipForward = icon(LucideSkipForward);
export const SlidersHorizontal = icon(LucideSlidersHorizontal);
export const Sparkle = icon(LucideSparkles);
export const SpeakerHigh = icon(LucideVolume2);
export const SpeakerLow = icon(LucideVolume1);
export const SpeakerX = icon(LucideVolumeX);
export const Star = icon(LucideStar);
export const Storefront = icon(LucideStore);
export const TextAlignLeft = AlignLeft;
export const ThumbsDown = icon(LucideThumbsDown);
export const Trash = icon(LucideTrash);
export const User = icon(LucideUser);
export const UserCircle = icon(LucideCircleUserRound);
export const UsersThree = icon(LucideUsersRound);
export const Wallet = icon(LucideWallet);
export const WarningCircle = icon(LucideCircleAlert);
export const X = icon(LucideX);
export const XCircle = icon(LucideCircleX);

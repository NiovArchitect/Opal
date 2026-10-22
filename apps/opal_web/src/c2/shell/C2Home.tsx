/**
 * Repair #18 - Division C2 - Home and social feed (track-c2 section 7).
 * Stories first, feed second, nothing trapped: every flow opens through
 * TopLayer and every flow has a close that always works.
 *
 * The story chooser is a SHEET at sheet band, never a dropdown inside
 * the rail cell (the Repair 15/16 clipping failure is impossible by
 * construction: the rail sets no fixed height and no overflow hidden
 * in the vertical axis, and the sheet is not a descendant of the cell).
 */
import React, { useEffect, useRef, useState } from "react";
import { TopLayer } from "../../opalUi/TopLayer";
import { OrbLockup } from "../../brand/orb/OrbMark";
import { PlanCardC2, litWinnerId } from "../PlanCardC2";
import {
  createTemporaryStory,
  followUser,
  getMomentLight,
  likeSocialMoment,
  listPeopleProjection,
  previewSocialMomentAudience,
  repostSocialMoment,
  saveSocialMoment,
  unfollowUser,
  publishSocialMoment,
  unlikeSocialMoment,
  unrepostSocialMoment,
  unsaveSocialMoment,
  uploadSocialMomentMedia,
} from "../../api/productClient";
import { MOMENT_AUDIENCE_OPTIONS, type MomentAudienceValue } from "./adopt3";
import {
  CREATION_TENSE_LABELS,
  SEED_DOOR_LABELS,
  doorsForSource,
  happeningFirst,
  lightTierFor,
  seedCreateFor,
  type CreationTense,
  type SeedBranch,
  type SeedCreate,
  type SeedSource,
} from "./flows2";
import { GoLiveFlow } from "./GoLiveFlow";
import { placeWarmthLevel } from "./shellData";
import { StoryViewerC2, storyQueueFromRail, type StoryPlayItem } from "./StoryViewerC2";
import { TriviaCard } from "./C2Trivia";
import type { HomeOccasion } from "./projections";
import { AuthedImage } from "../../media/AuthedImage";
import type {
  FeedCardProjection,
  HomeProjection,
  PlaceStoneProjection,
  StoryRailProjection,
} from "./projections";
import {
  Avatar,
  EmptyBlock,
  HeartGlyph,
  IconActivity,
  IconBranchAgain,
  IconBranchJoin,
  IconBranchPeople,
  IconBranchSolo,
  IconCamera,
  IconChats,
  IconClose,
  IconGraphIn,
  IconImage,
  IconPerson,
  IconRepost,
  IconSave,
  IconSearch,
  IconText,
} from "./bits";

/**
 * Repair #19 (W9) - the AMBIENT SOCIAL SYSTEM on Home, each element
 * with its recorded reason (the founder's ambient law: an ambient
 * element that cannot state its reason in one sentence is cut).
 * All treatments use ONLY the canon indicator tokens
 * (--orb-indicator-* / --state-*) at ambient intensity, the same
 * tokens and meanings as the plan cards, chats, thread, calls and
 * graphs treatments (indicator persistence law: a state keeps its
 * color and meaning on every surface). Motion obeys QUIET: the
 * only loops are the forming breath (already canon on plan cards)
 * and the live pulse below - both slow, both opacity-only, both
 * off under prefers-reduced-motion.
 */
export const HOME_AMBIENT_ELEMENTS: ReadonlyArray<{
  element: string;
  reason: string;
}> = [
  {
    element: "plan card state border + state rule (per state family)",
    reason:
      "Tells you the plan's state at a glance, in the same color and pattern as everywhere else in Opal, so alignment reads before words do.",
  },
  {
    element: "forming plan state-rule breath (5s, opacity only)",
    reason:
      "A forming plan is still taking shape; the slow breath marks anticipation - it is alive and waiting on one thing, not settled.",
  },
  {
    element: "live card happening border + soft pulse",
    reason:
      "Someone is live at a place right now and the window is short; the pulse says the moment is happening, not scheduled.",
  },
  {
    element: "moment stone fire border (happening = cyan fire, loved = warm ring metal, new = iridescent, seen = quiet)",
    reason:
      "Shows whose moment is live, loved, or new before you read a name, in the state-fire language every Opal surface speaks - people come before chrome, and the living graph orders the stones (happening first), never raw recency.",
  },
  {
    element: "the braided stream (two staggered currents; wide stones for plans, Lives, occasions and the game)",
    reason:
      "Flows is a social world moving: kinds are told by shape alone - wide stones are what the stream bends around, narrow stones are moments drifting between them. No labeled sections; the shape is the label (Discovery Doctrine).",
  },
  {
    element: "play-of-color sheen current under the stream (violet-cyan-gold, very subtle, slow)",
    reason:
      "The page's register is Play: a living current under the surface says this world is moving even in a quiet moment. It carries no state and no information; it holds still as a gradient under reduced motion.",
  },
  {
    element: "memory card author tint on the no-image monogram",
    reason:
      "When a post has no photo, the author's own tint and initial keep it recognisably theirs - a designed place treatment, never a caption sitting in an image hole.",
  },
  {
    element: "activity badge count on the header",
    reason:
      "Something changed since you last looked; the count is the ambient signal, and it is absent when nothing is new (presence discipline).",
  },
  {
    element: "room light at the head of the Home scroll (static ring-metal field, 10%)",
    reason:
      "The social room is lit because Opal is present in it; the light is the orb's own ring metal, never a state color, so presence reads in a still frame without borrowing any plan's state.",
  },
  {
    element: "one lit plan card per Home (burst coalescence cap)",
    reason:
      "When several plans could glow at once, only the strongest state carries the full lit register and the rest rest at border-only, so importance stays readable instead of everything shouting at once.",
  },
  {
    element: "moment light glow tiers (cold / warm / warmer / glow) on the Light control",
    reason:
      "A moment collects light from its people; the glow's warmth is the count made visible in light language, so appreciation is felt, never scored - no numeral renders anywhere on the card.",
  },
  {
    element: "presence lights row (a person's light, cyan, under the stones)",
    reason:
      "One of your people is live right now; their light at first paint says the room is alive this minute, in the same cyan as every happening state in Opal.",
  },
  {
    element: "happening strip directly under the stones (Lives and happening plans)",
    reason:
      "What is happening now outranks everything scheduled; lifting it to the eye's second fixation makes the page's first seconds about people in motion, not plans at rest.",
  },
  {
    element: "seed door row on a card (quiet text doors, shown on ask)",
    reason:
      "A moment you love is a plan trying to happen; the doors turn feeling into alignment in one tap, and they rest hidden until asked so the stream stays a stream, not a toolbar.",
  },
  {
    element: "place stone fire (the state color of the place's strongest real signal, at its computed energy level)",
    reason:
      "A place your people are moving through glows in the state language every Opal surface speaks, so where the energy is reads before a word does - and a place with no real signal carries no stone and no glow at all.",
  },
];

export type C2HomeEvents = {
  openYou: () => void;
  openSearch: () => void;
  openActivity: () => void;
  openGraph: (cardId: string) => void;
  /** Repair #19 W20 (JA-06): a feed card's action button renders
   *  ONLY when the host wires this to a real outcome. The
   *  production shell wires nothing here, so a card renders no
   *  button at all - a dead Watch button on Home was the defect.
   *  (Repair #23 WS-23-3: the Live card's destination now exists
   *  and travels on its own event, openLive below - feedAction
   *  was never the live journey's honest name.) Hosts must never
   *  pass a no-op here. */
  feedAction?: (cardId: string, actionId: string) => void;
  /** Called after a story or post really published, so the shell
   *  re-requests the Home projection and re-renders from it. */
  onShared: () => void;
  bearer?: string;
  /** Repair #21 (W-9 rebuild): an occasion's doorway into the
   *  real create flow, prefilled by the shell. Absent = the
   *  occasion renders without its action (no dead controls). */
  occasionPlan?: (occasion: HomeOccasion) => void;
  /** Repair #21 (W-12): tapping a person lands on the pair's
   *  shared stone. Absent = the anchor name is not a door. */
  openBond?: (personId: string, name: string) => void;
  /** Repair #21 (W-13): a reply is a DOOR - it opens the direct
   *  conversation with the moment's author (the shell resolves
   *  or creates it through the real conversation path). Absent =
   *  no reply control renders. */
  replyToPerson?: (authorUserId: string) => void;
  /** Repair #23 (WS-23-1): the moment's comments, opened from
   *  the card's speech-bubble glyph (audit F-3 / R-1). The shell
   *  mounts the comments sheet in its sheet stack with the
   *  bearer. Absent = no comments control renders (no dead
   *  control). This is NOT the reply door: replyToPerson above
   *  opens the author's direct conversation and keeps its own
   *  person door on the card. */
  openComments?: (momentId: string) => void;
  /** Repair #23 (WS-23-3): a Live card was tapped; the shell
   *  opens the watch surface for this room (audit F-2). The id
   *  is the ROOM id (the projection's watch: action id carries
   *  it), not the card id. This is its own event, NOT a
   *  feedAction overload, so the live journey is named honestly
   *  in code. Absent = the card renders as a resting article
   *  with no tap target (never a destination-shaped dead end
   *  dressed as a door). */
  openLive?: (liveId: string) => void;
  /** Repair #21 (I-1 refined): one of the four seed doors was
   *  chosen; the shell carries the composed create into the real
   *  graph-create flow. Absent = no door row renders. */
  seedDoor?: (create: SeedCreate) => void;
  /** Repair #21 (W-17): one of the creation sheet's three tenses
   *  was carried into a new graph; the shell opens the real
   *  graph-create flow carrying the tense (its When words + its
   *  marble anchor). Absent = the tense buttons do not render.
   *  Repair #22 (R22-E): the tense is chosen on its marble button
   *  and confirmed on the tense panel's New graph door. */
  creationPlan?: (tense: CreationTense) => void;
  /** Repair #22 (WS-5): a place stone was tapped; the shell opens
   *  the place view on the stone's own projection. Absent = the
   *  stone renders as a resting stone, not a dead tap target. */
  openPlace?: (place: PlaceStoneProjection) => void;
};

type MemoryFeedItem = Extract<FeedCardProjection, { kind: "memory" }>;

/**
 * The Home memory card. JA-12: when the card's image FAILS to
 * load, the well keeps its designed height and renders the same
 * designed monogram treatment the no-photo case uses — never a
 * collapsed well or a broken-image hole.
 */
function MemoryFeedCard({
  item,
  bearer,
  events,
}: {
  item: MemoryFeedItem;
  bearer?: string;
  events: C2HomeEvents;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  // W21 (F1): a new record image gets a fresh authenticated attempt.
  useEffect(() => setPhotoFailed(false), [item.photoUrl]);
  const showPhoto = Boolean(item.photoUrl) && !photoFailed;
  // Repair #21 (W-13 + I-2) - LIGHT, Opal-style, counts-free.
  // Giving light is the real like endpoint (PUT/DELETE
  // /social-moments/:id/like); the lit state and the warmth
  // re-render ONLY from its response - a failed write changes
  // nothing on the card. The warmth is internal: the surface
  // renders its GLOW TIER, never a numeral (the people-scoring
  // ban extends to social applause). One touch gives light; a
  // long press holds the glow deeper while held and commits the
  // same single light on release.
  const [liked, setLiked] = useState(item.viewerLiked === true);
  const [warmth, setWarmth] = useState(item.likeCount ?? 0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [held, setHeld] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The author's own read of who lit this moment (W-13): the
  // roster endpoint is author-gated server-side; a non-author
  // card never asks for names it may not hold.
  const [lightPeople, setLightPeople] = useState<string[]>([]);
  useEffect(() => {
    setLiked(item.viewerLiked === true);
    setWarmth(item.likeCount ?? 0);
  }, [item.viewerLiked, item.likeCount]);
  useEffect(() => {
    if (!item.mine) return;
    let live = true;
    void (async () => {
      try {
        const res = await getMomentLight(item.id, bearer);
        if (!live) return;
        setLightPeople(res.people.map((p) => p.display_name));
        setWarmth(res.warmth);
        setLiked(res.viewer_liked === true);
      } catch {
        /* the card keeps the projection's last truth */
      }
    })();
    return () => {
      live = false;
    };
  }, [item.id, item.mine, bearer]);
  const toggleLight = async () => {
    if (likeBusy) return;
    setLikeBusy(true);
    try {
      const res = liked
        ? await unlikeSocialMoment(item.id, bearer)
        : await likeSocialMoment(item.id, bearer);
      setLiked(res.viewer_liked === true);
      setWarmth(typeof res.like_count === "number" ? res.like_count : warmth);
      if (item.mine) {
        try {
          const roster = await getMomentLight(item.id, bearer);
          setLightPeople(roster.people.map((p) => p.display_name));
          setWarmth(roster.warmth);
        } catch {
          /* roster refresh is a read-back, never a blocker */
        }
      }
    } catch {
      /* the card keeps the server's last truth */
    } finally {
      setLikeBusy(false);
    }
  };
  // Repair #23 (WS-23-1) - REPOST and SAVE, the same truth law
  // as light: the resting state comes from the moment record's
  // own fields (the feed payload's engagement_summary carries
  // viewer_reposted / viewer_saved - see projections.ts), a tap
  // writes through the real repost / save endpoints, and the
  // state re-renders ONLY from the action response. A failed
  // write changes nothing on the card. The repost count is an
  // internal input only - no numeral renders, ever (the
  // counts-free law that governs light governs these too).
  const [reposted, setReposted] = useState(item.viewerReposted === true);
  const [saved, setSaved] = useState(item.viewerSaved === true);
  const [repostBusy, setRepostBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  useEffect(() => {
    setReposted(item.viewerReposted === true);
    setSaved(item.viewerSaved === true);
  }, [item.viewerReposted, item.viewerSaved]);
  const toggleRepost = async () => {
    if (repostBusy) return;
    setRepostBusy(true);
    try {
      const res = reposted
        ? await unrepostSocialMoment(item.id, bearer)
        : await repostSocialMoment(item.id, bearer);
      setReposted(res.viewer_reposted === true);
    } catch {
      /* the card keeps the server's last truth */
    } finally {
      setRepostBusy(false);
    }
  };
  const toggleSave = async () => {
    if (saveBusy) return;
    setSaveBusy(true);
    try {
      const res = saved
        ? await unsaveSocialMoment(item.id, bearer)
        : await saveSocialMoment(item.id, bearer);
      setSaved(res.viewer_saved === true);
    } catch {
      /* the card keeps the server's last truth */
    } finally {
      setSaveBusy(false);
    }
  };
  const beginHold = () => {
    holdTimer.current = setTimeout(() => setHeld(true), 350);
  };
  const endHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHeld(false);
  };
  const seed: SeedSource = {
    kind: "moment",
    momentId: item.id,
    authorUserId: item.authorUserId ?? null,
    authorName: item.authorName ?? item.authorLine,
    caption: item.contextLine === "Memory" ? "" : item.contextLine,
    placeLabel: item.placeLabel ?? null,
    mine: item.mine === true,
  };
  const doors = events.seedDoor ? doorsForSource(seed) : [];
  const [doorsOpen, setDoorsOpen] = useState(false);
  // Repair #21 round 3 (F-D/F-F, superseding CF2-2's wording) -
  // the resting card carries GLYPHS ONLY: the light heart, the
  // reply glyph (the product's own chat mark), and the
  // graph-in glyph drawn as the graph itself. The take-panel
  // opens from graph-in or a long-press on the card; its four
  // branches ride as drawn party compositions with captions of
  // at most two words. The CF2-2 doorway glyph DIED here: at
  // card size it read as a bell, a dome, an igloo - anything
  // but a door (F-E). The word-buttons ("Light", "Reply", the
  // take-family labels) died with it (F-D/F-F).
  //
  // Repair #23 (WS-23-1, audit F-3) - the round-3 reply glyph
  // was the speech bubble (IconChats), and every social reader
  // reads a speech bubble as COMMENTS - but it opened the
  // author's DM. The row is re-glyphed honestly:
  // - the speech bubble now means what it says: it opens this
  //   moment's comments (events.openComments);
  // - the author-thread jump keeps its own door, re-glyphed as
  //   the PERSON (IconPerson) - a head-and-shoulders silhouette
  //   no reader mistakes for a bubble at phone size: one door
  //   is about the post, the other is about the person.
  // Repost and save join the same row (see the placement note
  // at the row itself).
  const canReply = !item.mine && Boolean(item.authorUserId) && Boolean(events.replyToPerson);
  const canComment = Boolean(events.openComments);
  const hasSurface = doors.length > 0;
  const doorHold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beginDoorHold = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input, textarea")) return;
    doorHold.current = setTimeout(() => setDoorsOpen(true), 500);
  };
  const endDoorHold = () => {
    if (doorHold.current) clearTimeout(doorHold.current);
    doorHold.current = null;
  };
  return (
    <article
      className="c2s-card c2s-memory-card"
      data-testid="c2-feed-memory"
      data-media={showPhoto ? "photo" : "monogram"}
      onPointerDown={beginDoorHold}
      onPointerUp={endDoorHold}
      onPointerLeave={endDoorHold}
    >
      <div className="c2s-card-byline">
        {item.authorAvatar ? <Avatar avatar={item.authorAvatar} size={32} /> : null}
        <p className="c2s-card-line" style={{ margin: 0 }}>
          {item.authorLine}
        </p>
      </div>
      <div
        className="c2s-media-well"
        data-testid="c2-feed-memory-media"
        data-media-provenance={item.photoProvenance ?? undefined}
      >
        {showPhoto ? (
          <AuthedImage
            src={item.photoUrl!}
            alt=""
            draggable={false}
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          /* W9 no-image treatment: a designed place treatment - the
           * author's monogram in their entity tint over a map-like
           * motif. NEVER a text paragraph in an image-shaped hole
           * (the founder's "Race night dinner" defect) and never a
           * stock photo. JA-12: a FAILED photo lands here too. */
          <span
            className="c2s-media-monogram"
            data-testid="c2-feed-memory-monogram"
            data-tint={item.authorAvatar?.tint ?? undefined}
            aria-hidden
          >
            <span className="c2s-media-monogram-initial">
              {item.authorAvatar?.initials ??
                (item.authorName ?? item.authorLine).slice(0, 1).toUpperCase()}
            </span>
          </span>
        )}
      </div>
      <p className="c2s-card-title">{item.contextLine}</p>
      {item.placeLabel ? (
        <p className="c2s-card-line" data-testid="c2-feed-memory-place">
          At {item.placeLabel}
        </p>
      ) : null}
      <div className="c2s-card-byline c2s-light-row">
        <button
          type="button"
          className="c2s-heart-btn"
          data-testid="c2-light-heart"
          data-lit={liked ? "1" : undefined}
          data-tier={lightTierFor(warmth)}
          data-held={held ? "1" : undefined}
          aria-pressed={liked}
          aria-label={liked ? "You lit this - tap to take it back" : "Give light"}
          disabled={likeBusy}
          onPointerDown={beginHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onClick={() => void toggleLight()}
        >
          <HeartGlyph />
        </button>
        {item.mine && lightPeople.length > 0 ? (
          <span className="c2s-light-people" data-testid="c2-light-people">
            {lightPeople.join(", ")}
          </span>
        ) : null}
        <span className="c2s-row-spacer" aria-hidden />
        {/* Repair #23 (WS-23-1) - the honest row. Order is the
         * reading order of the acts: light (felt), comments
         * (say it here), the person door (say it to them),
         * repost (share it onward), save (keep it), graph-in
         * (make it a plan). PLACEMENT DECISION, made on the
         * rendered row: repost and save live IN this row, not
         * in the card context menu, for two reasons a frame
         * proves - (1) the row does not crowd: six 40px glyph
         * doors plus the heart fit the card's inner width at
         * phone size with the spacer intact, each silhouette
         * distinct; (2) repost / save are STATEFUL - a state
         * that lives behind a long-press is a state the reader
         * cannot see at rest, and presence at rest is the
         * calibrated noise law. The card's long-press already
         * belongs to the take-panel, so a context menu here
         * would also have fought that gesture. */}
        {canComment ? (
          <button
            type="button"
            className="c2s-glyph-btn"
            data-testid="c2-feed-comments"
            aria-label="Comments on this moment"
            onClick={() => events.openComments!(item.id)}
          >
            <IconChats size={21} />
          </button>
        ) : null}
        {canReply ? (
          <button
            type="button"
            className="c2s-glyph-btn"
            data-testid="c2-feed-reply"
            aria-label={`Message ${item.authorName ?? "them"}`}
            onClick={() => events.replyToPerson!(item.authorUserId!)}
          >
            <IconPerson size={21} />
          </button>
        ) : null}
        <button
          type="button"
          className="c2s-glyph-btn c2s-repost-btn"
          data-testid="c2-feed-repost"
          data-active={reposted ? "1" : undefined}
          aria-pressed={reposted}
          aria-label={reposted ? "You reposted this - tap to take it back" : "Repost this moment"}
          disabled={repostBusy}
          onClick={() => void toggleRepost()}
        >
          <IconRepost size={21} />
        </button>
        <button
          type="button"
          className="c2s-glyph-btn c2s-save-btn"
          data-testid="c2-feed-save"
          data-active={saved ? "1" : undefined}
          aria-pressed={saved}
          aria-label={saved ? "Saved - tap to remove from Saved" : "Save this moment"}
          disabled={saveBusy}
          onClick={() => void toggleSave()}
        >
          <IconSave size={21} />
        </button>
        {hasSurface ? (
          <button
            type="button"
            className="c2s-glyph-btn c2s-graphin-btn"
            data-testid="c2-feed-doors"
            aria-label="Graph this in"
            aria-expanded={doorsOpen}
            onClick={() => setDoorsOpen((open) => !open)}
          >
            <IconGraphIn />
          </button>
        ) : null}
      </div>
      {doorsOpen && hasSurface ? (
        <TakePanel
          source={seed}
          onDoor={(create) => {
            setDoorsOpen(false);
            events.seedDoor!(create);
          }}
        />
      ) : null}
    </article>
  );
}

/**
 * Repair #21 round 3 (F-F) - THE TAKE-PANEL: the I-1 family's
 * presentation, rebuilt glyph-led. Each branch is a DRAWN party
 * composition (the glyphs in bits.tsx) with a caption of at
 * most two words; the full phrase survives only as the tile's
 * aria-label. The journeys are unchanged - each tile composes
 * its branch through the ONE pure builder
 * (flows2.seedCreateFor); a branch the builder refuses renders
 * no tile. (This replaces the CF2-2 labeled door surface and
 * its SeedDoorRow of text buttons, rejected as a button farm.)
 */
const TAKE_CAPTIONS: Record<SeedBranch, string> = {
  join: "Join",
  solo: "Solo",
  "my-people": "My people",
  again: "Again",
};
const TAKE_GLYPHS: Record<SeedBranch, React.ReactNode> = {
  join: <IconBranchJoin />,
  solo: <IconBranchSolo />,
  "my-people": <IconBranchPeople />,
  again: <IconBranchAgain />,
};
export function TakePanel({
  source,
  onDoor,
}: {
  source: SeedSource;
  onDoor: (create: SeedCreate) => void;
}) {
  const doors = doorsForSource(source)
    .map((branch) => ({ branch, create: seedCreateFor(source, branch) }))
    .filter((d): d is { branch: SeedBranch; create: SeedCreate } => d.create !== null);
  if (doors.length === 0) return null;
  return (
    <div className="c2s-take-panel" data-testid="c2-take-panel" role="group" aria-label="Ways in">
      {doors.map(({ branch, create }) => (
        <button
          key={branch}
          type="button"
          className="c2s-take-tile"
          data-testid="c2-seed-door"
          data-branch={branch}
          aria-label={SEED_DOOR_LABELS[branch]}
          onClick={() => onDoor(create)}
        >
          <span className="c2s-take-glyph" aria-hidden>
            {TAKE_GLYPHS[branch]}
          </span>
          <span className="c2s-take-caption">{TAKE_CAPTIONS[branch]}</span>
        </button>
      ))}
    </div>
  );
}

/** A plan card's take doors (I-1): the same graph-in glyph +
 *  take-panel as the moment's, under the card. The card itself
 *  stays the card; the panel is the wrap's own furniture. */
function PlanDoors({
  seed,
  onDoor,
}: {
  seed: SeedSource;
  onDoor: (create: SeedCreate) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="c2s-plan-doors">
      <button
        type="button"
        className="c2s-glyph-btn c2s-graphin-btn"
        data-testid="c2-plan-doors"
        aria-label="Graph this in"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <IconGraphIn />
      </button>
      {open ? (
        <TakePanel
          source={seed}
          onDoor={(create) => {
            setOpen(false);
            onDoor(create);
          }}
        />
      ) : null}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const out = String(reader.result ?? "");
      resolve(out.includes(",") ? out.split(",")[1] : out);
    };
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

export function C2Home({
  projection,
  events,
}: {
  projection: HomeProjection;
  events: C2HomeEvents;
}) {
  const [sheet, setSheet] = useState<null | "create">(null);
  // Repair #22 (R22-E): the tense chosen on the Create sheet's
  // marble row. Choosing a tense opens that tense's own creation
  // panel INSIDE the sheet (New graph / Photo or video / Text /
  // Go live offered within the tense) instead of leaving the
  // sheet; null = the sheet's top level.
  const [tensePanel, setTensePanel] = useState<CreationTense | null>(null);
  // Repair #21 (W-17): the composer opens in a mode - media-first
  // (photo/video) or text-first - with a destination (story or
  // post). The sheet's media door carries the destination toggle;
  // the capability fallbacks in openSelf open it locked, as
  // before. Text-first is post-only: stories require media by
  // the server's own rule, posts do not (a caption-only post is
  // lawful; an empty one is rejected).
  const [composer, setComposer] = useState<null | {
    kind: "story" | "post";
    mediaFirst: boolean;
    toggle: boolean;
  }>(null);
  const [liveOpen, setLiveOpen] = useState(false);
  // R22 (WS-3): the story viewer runs a QUEUE — the rail's live
  // stories flattened in rail order from the opened stone to
  // the rail's end (StoryViewerC2 owns dwell + auto-advance).
  const [viewerQueue, setViewerQueue] = useState<StoryPlayItem[] | null>(null);
  const rail = projection.rail;

  /** The rail as ordered story groups: your own story first,
   *  then each person's, exactly as the stones render. */
  const railStoryGroups = (): Array<{
    key: string;
    personName: string;
    personId?: string | null;
    items: Array<{ id: string; mediaUrl: string; caption?: string | null; expiresAt?: string | null }>;
  }> => {
    const groups: Array<{
      key: string;
      personName: string;
      personId?: string | null;
      items: Array<{ id: string; mediaUrl: string; caption?: string | null; expiresAt?: string | null }>;
    }> = [];
    const selfStory = rail.self.story;
    if (selfStory) {
      const items = selfStory.items?.length
        ? selfStory.items
        : selfStory.mediaUrl
          ? [{ id: "self-story", mediaUrl: selfStory.mediaUrl, caption: selfStory.caption, expiresAt: null }]
          : [];
      if (items.length > 0) {
        groups.push({ key: "self", personName: "You", personId: null, items });
      }
    }
    for (const s of rail.stories) {
      const items = s.items?.length
        ? s.items
        : s.mediaUrl
          ? [{ id: s.id, mediaUrl: s.mediaUrl, caption: s.caption ?? null, expiresAt: null }]
          : [];
      if (items.length > 0) {
        groups.push({ key: s.id, personName: s.personName, personId: s.personId, items });
      }
    }
    return groups;
  };

  /** Open the viewer on one rail group; the queue runs from
   *  that group to the rail's end (expired stories filtered at
   *  open time — storyQueueFromRail). */
  const openStoryGroup = (key: string) => {
    const groups = railStoryGroups();
    const start = Math.max(0, groups.findIndex((g) => g.key === key));
    const queue = storyQueueFromRail(groups, start);
    if (queue.length > 0) setViewerQueue(queue);
  };

  // R19 W27 (AT-10 / AR-F4): Home's lit coalescence - at most ONE
  // plan card on Home carries the full lit register (glow + ground
  // + breath); the strongest state wins and every other candidate
  // rests at border-only. The verdict is computed once per render
  // from the projection's own families - cards never self-elect.
  const homeLitId = litWinnerId(
    projection.feed
      .filter((item) => item.kind === "plan")
      .map((item) => ({
        id: item.id,
        stateFamily: item.kind === "plan" ? item.card.stateFamily : "past",
      })),
  );

  const openSelf = () => {
    // Hunt-fix B-10 + JA-11: your own live story opens the viewer
    // on its own record when the rail carries its media; a live
    // story without renderable media, and the no-story case, go
    // to create — never to an empty stage.
    if (rail.self.hasLiveStory && rail.self.story?.mediaUrl) {
      openStoryGroup("self");
      return;
    }
    if (rail.self.hasLiveStory) return;
    if (rail.capabilities.canPost && rail.capabilities.canStory) {
      setTensePanel(null);
      setSheet("create");
    } else if (rail.capabilities.canStory) {
      setComposer({ kind: "story", mediaFirst: true, toggle: false });
    } else if (rail.capabilities.canPost) {
      setComposer({ kind: "post", mediaFirst: true, toggle: false });
    }
  };

  // Repair #21 (W-15) - happening first: Lives and happening
  // plans lift out of the braid to directly under the stones;
  // everything else keeps the braid's own order below.
  const { happening, rest } = happeningFirst(projection.feed);

  const renderFeedItem = (item: FeedCardProjection) => {
    if (item.kind === "plan") {
      const planSeed: SeedSource | null = item.seed
        ? {
            kind: "plan",
            planId: item.id,
            title: item.seed.title,
            location: item.seed.location,
            placeLat: item.seed.placeLat,
            placeLon: item.seed.placeLon,
            planType: item.seed.planType,
            viewerState: item.seed.viewerState,
            organizerUserId: item.seed.organizerUserId,
          }
        : null;
      return (
        <div key={item.id} className="c2s-plan-wrap">
          <PlanCardC2
            input={{
              ...item.card,
              // past is not a capped candidate - it rests
              // (no lit verdict at all).
              lit:
                item.card.stateFamily === "past" ? undefined : item.id === homeLitId,
            }}
            onOpen={() => events.openGraph(item.id)}
          />
          {planSeed && events.seedDoor ? (
            <PlanDoors seed={planSeed} onDoor={(create) => events.seedDoor!(create)} />
          ) : null}
        </div>
      );
    }
    if (item.kind === "memory") {
      return <MemoryFeedCard key={item.id} item={item} bearer={events.bearer} events={events} />;
    }
    if (item.kind === "live") {
      // Repair #23 (WS-23-3) - the Live card IS its destination
      // (audit F-2): the card is destination-shaped, so the whole
      // card becomes the tap target firing events.openLive with
      // the ROOM id (the projection's watch: action id carries
      // it). The place stone's proven form: a button when the
      // shell wires the door, a resting article when it does not.
      const roomId = item.actionId.startsWith("watch:")
        ? item.actionId.slice("watch:".length)
        : item.id.replace(/^live-/, "");
      const liveInner = (
        <>
          <div className="c2s-card-byline">
            {item.hostAvatar ? <Avatar avatar={item.hostAvatar} size={32} /> : null}
            <span className="c2s-live-pill" data-testid="c2-live-pill">
              <span className="c2s-live-dot" aria-hidden />
              Live now
            </span>
            {item.mine ? <span className="c2s-card-line">Your live</span> : null}
          </div>
          {/* Founder verdict V-c (2026-10-20 19:45 PDT): a Live
              is a first-class citizen of the stream and takes the
              stream's berth - the same media well a moment stone
              gets. The room record carries no stream still, so
              the berth is filled with the designed place
              treatment (the host's monogram in their tint over
              the map motif) washed in happening light - never a
              fabricated stream image. */}
          <div className="c2s-media-well c2s-live-well" data-testid="c2-live-media">
            <span
              className="c2s-media-monogram"
              data-tint={item.hostAvatar?.tint ?? undefined}
              aria-hidden
            >
              <span className="c2s-media-monogram-initial">
                {item.hostAvatar?.initials ??
                  (item.hostName ?? "L").slice(0, 1).toUpperCase()}
              </span>
            </span>
          </div>
          <p className="c2s-card-title">{item.title}</p>
          <p className="c2s-card-line">{item.contextLine}</p>
          {item.placeLabel ? (
            <p className="c2s-card-line" data-testid="c2-live-place">
              At {item.placeLabel}
            </p>
          ) : null}
          {/* Repair #21 (I-3) - co-presence as lights: the people
              the live's own record names as present - its host,
              and you when it is yours. The room record carries no
              watcher roster today, so no other light is painted;
              the roster is designed + declared in the wave report.
              CF2-3: the marker is a LIGHT - a radiant orb in the
              person's tint, ringed in the happening cyan - never
              a letter tile; the host's name is the card's byline
              and this light's accessible name. */}
          <div className="c2s-live-presence" data-testid="c2-live-presence">
            {item.hostAvatar ? (
              <span
                className="c2s-live-light"
                data-testid="c2-live-light"
                data-tint={item.hostAvatar.tint ?? undefined}
                data-mine={item.mine ? "1" : undefined}
                role="img"
                aria-label={`${item.hostName ?? "The host"} is here`}
              />
            ) : null}
            {item.mine ? <span className="c2s-card-line">You are here</span> : null}
          </div>
        </>
      );
      if (events.openLive) {
        return (
          <button
            key={item.id}
            type="button"
            className="c2s-card c2s-live-card"
            data-testid="c2-feed-live"
            data-plan-state="happening"
            data-live-id={roomId}
            aria-label={`Watch - ${item.title}`}
            onClick={() => events.openLive!(roomId)}
          >
            {liveInner}
          </button>
        );
      }
      return (
        <article
          key={item.id}
          className="c2s-card c2s-live-card"
          data-testid="c2-feed-live"
          data-plan-state="happening"
        >
          {liveInner}
          {events.feedAction ? (
            <button
              type="button"
              className="c2s-card-action"
              onClick={() => events.feedAction!(item.id, item.actionId)}
            >
              {item.actionLabel}
            </button>
          ) : null}
        </article>
      );
    }
    return (
      <article key={item.id} className="c2s-card" data-testid={`c2-feed-${item.kind}`}>
        <p className="c2s-card-title">{item.title}</p>
        <p className="c2s-card-line">{item.contextLine}</p>
        {events.feedAction ? (
          <button
            type="button"
            className="c2s-card-action"
            onClick={() => events.feedAction!(item.id, item.actionId)}
          >
            {item.actionLabel}
          </button>
        ) : null}
      </article>
    );
  };

  // Repair #22 (WS-5) - the PLACE STONE: a wide stone in the
  // braid whose fire is the place's computed energy - its color
  // the state family of its strongest real signal, its glow its
  // energy level. It renders ONLY the builder's finished lines;
  // a place with no qualifying record never reaches this list.
  // Tappable only when the shell wires the place view - a stone
  // without the door rests as a stone, never as a dead button.
  const renderPlaceStone = (place: PlaceStoneProjection) => {
    const inner = (
      <>
        <div className="c2s-place-stone-head">
          <span className="c2s-place-fire" aria-hidden />
          <p className="c2s-card-title c2s-place-stone-name">{place.name}</p>
        </div>
        <p className="c2s-card-line c2s-place-stone-energy">{place.energyLine}</p>
        {place.signalLines.map((line) => (
          <p key={line} className="c2s-card-line">
            {line}
          </p>
        ))}
        {place.livesHere.length > 0 ? (
          <div className="c2s-live-presence" data-testid="c2-place-stone-presence">
            {place.livesHere.map((live) => (
              <span
                key={live.liveId}
                className="c2s-live-light"
                data-testid="c2-place-stone-light"
                role="img"
                aria-label={live.hostName ? `${live.hostName} is here` : "Live here"}
              />
            ))}
          </div>
        ) : null}
      </>
    );
    const stoneProps = {
      className: "c2s-card c2s-place-stone",
      "data-testid": "c2-place-stone",
      "data-energy-level": place.energyLevel,
      "data-energy-family": place.energyFamily,
      "data-place": place.name,
      // Repair #23 (WS-23-5): the server tier is the stone's
      // warmth input - light only. data-signal-tier carries the
      // tier word for the CSS warmth scale and for tests; the
      // visible surface renders no tier word, no numeral and no
      // "trending" label. data-warmth is the reconciled glow
      // level (the warmer of tier warmth and the R22 level;
      // plan-state fire keeps its color via data-energy-family).
      "data-signal-tier": place.signalTier ?? "none",
      "data-warmth": placeWarmthLevel(place),
      "data-nearby": place.signalNearby ? "true" : "false",
    } as const;
    return events.openPlace ? (
      <button
        key={place.key}
        type="button"
        {...stoneProps}
        onClick={() => events.openPlace!(place)}
      >
        {inner}
      </button>
    ) : (
      <article key={place.key} {...stoneProps}>
        {inner}
      </article>
    );
  };

  return (
    <div
      data-testid="c2-home"
      data-surface-purpose="people-and-moments"
      style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      <header className="c2s-header">
        <Avatar
          avatar={projection.header.ownAvatar}
          size={36}
          onClick={events.openYou}
          label="You"
        />
        <div style={{ flex: 1 }}>
          <OrbLockup form="wordmark" wordmarkWidth={72} />
        </div>
        <button
          type="button"
          className="c2s-icon-btn"
          aria-label="Search"
          data-testid="c2-home-search"
          onClick={events.openSearch}
        >
          <IconSearch />
        </button>
        <button
          type="button"
          className="c2s-icon-btn"
          aria-label="Activity"
          data-testid="c2-home-activity"
          onClick={events.openActivity}
        >
          <IconActivity />
          {projection.header.activityUnseenCount ? (
            <span className="c2s-badge" data-testid="c2-activity-badge">
              {projection.header.activityUnseenCount > 9
                ? "9+"
                : projection.header.activityUnseenCount}
            </span>
          ) : null}
        </button>
      </header>

      <div className="c2s-scroll" data-testid="c2-home-scroll">
        {/* Repair #21 (W-9 identity + layout law): the opening
            leads with PEOPLE as Moment Stones - round stones
            ringed by a thin orbit ring carrying the state fire,
            ordered by the living graph - then the braided
            stream. No labeled sections anywhere on this surface:
            kinds are told by shape alone (Discovery Doctrine),
            so its opening reads nothing like the Center deck,
            which leads with the orb and the Needs-you deck. */}
        <MomentStones
          rail={rail}
          onSelf={openSelf}
          onOpen={(s) => openStoryGroup(s.id)}
          onBond={events.openBond}
        />
        {/* Repair #21 round 3 (F-B) - the presence strip that
            rendered here DIED by founder charge: a mini-row
            repeating a live person's monogram, name and "Live"
            under the stones duplicated her story stone AND her
            Live card ("ultra redundant"). Live presence is
            carried ONLY by (i) the ring state on her stone and
            (ii) the Live stone in the stream. The W-14 presence
            derivation stays in the projection (its record
            stands); it renders nowhere on first paint. */}
        {happening.length > 0 ? (
          <div className="c2s-happening" data-testid="c2-happening">
            {happening.map((item) => renderFeedItem(item))}
          </div>
        ) : null}
        {projection.occasions && projection.occasions.length > 0 ? (
          <section data-testid="c2-home-occasions">
            {projection.occasions.map((occasion) => (
              <article
                key={occasion.id}
                className="c2s-card c2s-occasion-card"
                data-testid="c2-occasion-card"
              >
                <p className="c2s-card-title">
                  {occasion.personName} - {occasion.kindLabel}
                </p>
                <p className="c2s-card-line">
                  {occasion.dateLabel}
                  {occasion.daysUntil === 0
                    ? " - today"
                    : occasion.daysUntil === 1
                      ? " - tomorrow"
                      : ` - in ${occasion.daysUntil} days`}
                </p>
                {occasion.wouldLove ? (
                  <p className="c2s-card-line">{occasion.wouldLove}</p>
                ) : null}
                {events.occasionPlan ? (
                  <button
                    type="button"
                    className="c2s-card-action"
                    data-testid="c2-occasion-plan"
                    onClick={() => events.occasionPlan!(occasion)}
                  >
                    {occasion.actionLabel}
                  </button>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}
        {projection.trivia ? (
          <TriviaCard
            trivia={projection.trivia}
            bearer={events.bearer}
            onShared={events.onShared}
          />
        ) : null}
        <div className="c2s-feed c2s-stream" data-testid="c2-feed">
          {projection.feedError ? (
            <EmptyBlock
              testId="c2-feed-error"
              headline="Your feed did not load."
              line={projection.feedError}
              lineVisible
              actionLabel="Try again"
              onAction={events.onShared}
            />
          ) : null}
          {projection.places && projection.places.length > 0
            ? projection.places.map((place) => renderPlaceStone(place))
            : null}
          {projection.feed.length === 0 &&
          !projection.feedError &&
          !(projection.places && projection.places.length > 0) ? (
            <EmptyBlock
              testId="c2-feed-empty"
              headline="Nothing here yet."
              line="Posts from your people and your plans will show up here."
            />
          ) : (
            <>
              {/* Repair #23 (WS-23-4) - discovery is INTERLEAVED
                  into the braid after its first group, not buried
                  after the whole feed (audit R-4). The braid runs
                  in two staggered currents, so the first group is
                  the first two stream items; the discovery stone
                  takes the wide berth there - a wide stone the
                  stream parts around, in the stream's own rhythm -
                  and the rest of the braid keeps its order below
                  it. With fewer than two items the stone simply
                  follows what there is; with an empty feed it
                  renders after the places, as before. Discovery
                  therefore always lands inside the first scroll. */}
              {rest.slice(0, 2).map((item) => renderFeedItem(item))}
              {projection.discovery && projection.discovery.length > 0 ? (
                <section className="c2s-discovery" data-testid="c2-discovery">
                  {projection.discovery.map((person) => (
                    <DiscoveryRow
                      key={person.userId}
                      person={person}
                      bearer={events.bearer}
                    />
                  ))}
                </section>
              ) : null}
              {rest.slice(2).map((item) => renderFeedItem(item))}
            </>
          )}
        </div>
      </div>

      {sheet === "create" ? (
        <TopLayer band="sheet">
          <div
            className="c2s-scrim"
            data-testid="c2-create-sheet"
            onClick={() => {
              setSheet(null);
              setTensePanel(null);
            }}
          >
            <div
              className="c2s-sheet c2s-create-sheet"
              role="dialog"
              aria-label="Create"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Repair #21 (W-17) - the creation walkthrough. The
                  sheet explains nothing (Discovery): your graphs
                  in three tenses lead; then the moment doors -
                  photo or video, text, go live.
                  Repair #22 (R22-E) - the founder rejected the
                  tense STONES ("they look like avocados to me"):
                  the three tenses are now BUTTONS in the orbit
                  doorway button's marbled material - the shared
                  marble grain (ORB_ASSETS.marbleSphere, the same
                  asset OrbMark's marble seat carries) under each
                  tense's own multicolor iris (the five sampled
                  fire stops, re-led per tense; see c2shell.css).
                  Names are his: Now / Forecast / Memories.
                  Choosing a tense opens that tense's creation
                  panel INSIDE the sheet: New graph (the ONE real
                  graph-create flow carrying the tense), Photo or
                  video and Text (the real composers), and Go live
                  - all offered within the tense, one move deep. */}
              <p className="c2s-sheet-title">Create</p>
              {events.creationPlan ? (
                <div className="c2s-create-tenses">
                  {(Object.keys(CREATION_TENSE_LABELS) as CreationTense[]).map((tense) => (
                    <button
                      key={tense}
                      type="button"
                      className="c2s-create-tense-btn"
                      data-tense={tense}
                      data-marble="sphere"
                      data-testid={`c2-create-tense-${tense}`}
                      aria-label={`Create - ${CREATION_TENSE_LABELS[tense]}`}
                      aria-pressed={tensePanel === tense}
                      onClick={() => setTensePanel(tense)}
                    >
                      <span className="c2s-create-tense-label">
                        {CREATION_TENSE_LABELS[tense]}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {tensePanel ? (
                <div
                  className="c2s-create-tense-panel"
                  data-tense={tensePanel}
                  data-testid="c2-create-tense-panel"
                >
                  <button
                    type="button"
                    className="c2s-sheet-row"
                    data-testid="c2-create-tense-graph"
                    onClick={() => {
                      const tense = tensePanel;
                      setSheet(null);
                      setTensePanel(null);
                      events.creationPlan?.(tense);
                    }}
                  >
                    <IconGraphIn />
                    <span>New graph - {CREATION_TENSE_LABELS[tensePanel]}</span>
                  </button>
                  <button
                    type="button"
                    className="c2s-sheet-row"
                    data-testid="c2-create-tense-photo"
                    onClick={() => {
                      setSheet(null);
                      setTensePanel(null);
                      setComposer({ kind: "post", mediaFirst: true, toggle: true });
                    }}
                  >
                    <IconCamera />
                    <span>Photo or video</span>
                  </button>
                  <button
                    type="button"
                    className="c2s-sheet-row"
                    data-testid="c2-create-tense-text"
                    onClick={() => {
                      setSheet(null);
                      setTensePanel(null);
                      setComposer({ kind: "post", mediaFirst: false, toggle: false });
                    }}
                  >
                    <IconText />
                    <span>Text</span>
                  </button>
                  <button
                    type="button"
                    className="c2s-sheet-row"
                    data-testid="c2-create-tense-live"
                    onClick={() => {
                      setSheet(null);
                      setTensePanel(null);
                      setLiveOpen(true);
                    }}
                  >
                    <span className="c2s-live-light c2s-create-live-light" aria-hidden />
                    <span>Go live</span>
                  </button>
                  <button
                    type="button"
                    className="c2s-btn-text"
                    data-testid="c2-create-tense-back"
                    onClick={() => setTensePanel(null)}
                  >
                    Back
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="c2s-sheet-row"
                    data-testid="c2-create-photo"
                    onClick={() => {
                      setSheet(null);
                      setComposer({ kind: "post", mediaFirst: true, toggle: true });
                    }}
                  >
                    <IconCamera />
                    <span>Photo or video</span>
                  </button>
                  <button
                    type="button"
                    className="c2s-sheet-row"
                    data-testid="c2-create-text"
                    onClick={() => {
                      setSheet(null);
                      setComposer({ kind: "post", mediaFirst: false, toggle: false });
                    }}
                  >
                    <IconText />
                    <span>Text</span>
                  </button>
                  <button
                    type="button"
                    className="c2s-sheet-row"
                    data-testid="c2-create-live"
                    onClick={() => {
                      setSheet(null);
                      setLiveOpen(true);
                    }}
                  >
                    <span className="c2s-live-light c2s-create-live-light" aria-hidden />
                    <span>Go live</span>
                  </button>
                </>
              )}
              <button
                type="button"
                className="c2s-btn-text"
                data-testid="c2-create-sheet-cancel"
                onClick={() => {
                  setSheet(null);
                  setTensePanel(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </TopLayer>
      ) : null}

      {composer ? (
        <ShareComposer
          kind={composer.kind}
          mediaFirst={composer.mediaFirst}
          allowToggle={composer.toggle}
          bearer={events.bearer}
          onClose={() => setComposer(null)}
          onShared={() => {
            setComposer(null);
            events.onShared();
          }}
        />
      ) : null}

      {liveOpen ? (
        <GoLiveFlow
          bearer={events.bearer}
          onClose={() => setLiveOpen(false)}
          onLive={() => {
            setLiveOpen(false);
            events.onShared();
          }}
        />
      ) : null}

      {/* R22 (WS-3): the story viewer is its own component —
          dwell by content, auto-advance along the rail, filling
          progress segments, exit at the rail's end (StoryViewerC2).
          W-17 ext. stays: Reply is the viewer's one lawful live
          door; the light heart and take doors are DECLARED
          (D-15) — stories carry no engagement record, so nothing
          here pretends to light or graph a story. Exit returns
          to the stream untouched — Home never unmounted, so the
          scroll position is preserved by construction. */}
      {viewerQueue ? (
        <StoryViewerC2
          queue={viewerQueue}
          onClose={() => setViewerQueue(null)}
          onReply={
            events.replyToPerson
              ? (personId) => {
                  setViewerQueue(null);
                  events.replyToPerson!(personId);
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

/**
 * W21 (F1) face logic, carried into the Moment Stone: the
 * moment's OWN media through the authenticated image path, then
 * the person's photo, then their initials. Any load failure
 * falls through to the next treatment - never a broken hole.
 */
function StoneFace({
  avatar,
  mediaUrl,
}: {
  avatar: { photoUrl?: string | null; initials: string };
  mediaUrl?: string | null;
}) {
  const [mediaFailed, setMediaFailed] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  useEffect(() => {
    setMediaFailed(false);
    setPhotoFailed(false);
  }, [mediaUrl, avatar.photoUrl]);
  // The initials are ALWAYS rendered, with any image laid over
  // them: a stone is never blank while an image is in flight,
  // and a failed image removes itself to reveal them (glass fix:
  // the first capture pass caught stones mid-load, face-empty).
  const src = mediaUrl && !mediaFailed ? mediaUrl : avatar.photoUrl && !photoFailed ? avatar.photoUrl : null;
  return (
    <>
      {avatar.initials}
      {src ? (
        <AuthedImage
          src={src}
          alt=""
          draggable={false}
          onError={() => (mediaUrl && !mediaFailed ? setMediaFailed(true) : setPhotoFailed(true))}
        />
      ) : null}
    </>
  );
}

/**
 * Repair #21 (W-9 identity addendum; round 3 F-A) - MOMENT
 * STONES. History: the W-9 build replaced the face-circle rail
 * with an opal/oval pebble - the founder REJECTED the oval
 * outright in round 3 ("it just freaking bothers me") and
 * called the IG-escape debt in. The form now: a ROUND stone -
 * the moment itself (its own media, or the person's face)
 * inside a circle - carried by a THIN ORBIT RING, the brand's
 * ring language at story scale. State rides the RING:
 * happening wears cyan fire (marbled, W-19 - the live ring is
 * a special state and carries the signature material), a
 * loved tie wears warm ring metal, new wears the iridescent
 * current, seen rests quiet. The adapter orders them by the
 * living graph (happening > loved > new > seen), never by raw
 * recency. Every stone is ANCHORED to its person - the name
 * under the stone is the anchor - and the first stone is the
 * creation door, in the same grammar.
 *
 * Repair #22 (R22-A, WS-1) - ONE CAPTION GRAMMAR for every
 * stone, the self door included. Line 1 is the NAME (the
 * person; the door reads "Your moment"). Line 2 is exactly
 * ONE state word from the rail's closed vocabulary, mapped
 * 1:1 from the stone's state - the same state always wears
 * the same word, in the same type, on every surface that
 * renders this component:
 *   happening -> "Live"   loved -> "Loved"
 *   new       -> "New"    seen  -> "Seen"
 *   self door, no live moment -> "Add" (the door's own state
 *   word; its live state is "Live", like everyone else's).
 * The old rail broke this: the self cell rendered a free-text
 * liveStoryLabel (or "Live") while a live person read "Live
 * now" - one state, two forms. The free-text label is no
 * longer rendered in the rail.
 *
 * Repair #23 (R23-rail) - AMENDMENT to the WS-1 word map,
 * founder charge 2026-10-21 18:04: "Loved" as a caption is
 * semantically wrong - it describes the VIEWER's relationship
 * to the author, not the story's own state, and "Seen" is
 * likewise the viewer's history, not a state of the story.
 * Captions now speak ONLY the story's own state:
 *   happening -> "Live"   new (unseen, fresh) -> "New"
 *   seen      -> NO caption word (the line rests empty)
 *   loved     -> NO caption word, ever
 * The viewer's-history signal that used to print "Loved"
 * moves onto the RING as warmth (data-warmth below): the
 * signal is traced in shellData.ts - stoneState "loved" is
 * derived from the author's relationship type on the viewer's
 * own relationship rows (listRelationships: spouse / partner
 * / family / close_friend), NOT from any light the viewer
 * gave the story. The self door keeps its name "Your moment"
 * and follows the same map; its "+" and "Add" are the door's
 * affordance, not a caption, and they stay. The empty state
 * line still renders (empty) so every cell keeps the same
 * two-line rhythm and baseline. The posts vocabulary (Create
 * tenses Now / Forecast / Memories) is a separate vocabulary
 * and is untouched by this amendment.
 *
 * Repair #23 (R23-rail) - TWO-TIER RING GLOW (IF-1
 * resolution; founder-delegated parent decision 2026-10-21
 * 18:04). The story ring is EXEMPT from the flat 8px
 * glow-room token, tiered: RESTING (default) rings sit at
 * the 8px glow-room (var(--stream-glow-room), WS-4's stream
 * coherence); the founder-pinned 14px bloom blooms ONLY at
 * the ATTENTION tier, earned by a named trigger. The tier is
 * computed here from the projection's own fields (stoneState,
 * which the one adapter derives from the story/live records
 * and the viewer's relationship rows) and stamped on the
 * stone element as data-glow; CSS keys the two box-shadows
 * off it. Triggers wired today: happening (the story is
 * LIVE - from the lives leg's own records) and loved (the
 * author is the viewer's CLOSE PEOPLE - the relationship
 * type signal above). Named triggers with NO signal in the
 * rail record today - a response/mention involving the
 * viewer, and demonstrated-interest overlap - are DECLARED
 * in the R23 rail report, never faked here.
 *
 * Repair #22 (R22-A, WS-2) - the ring carries ORBITAL motion
 * in the brand orb's language: a point of light travels the
 * ring (the orb's rings rotate with dots riding them). The
 * motion MEANS state, one sentence: the faster and brighter
 * the light travels, the more alive the moment - Live orbits
 * fastest and brightest, New slower and softer, Loved
 * slowest and dimmest, Seen and the empty door rest, because
 * there is nothing alive or unread left to attend to. Under
 * reduced motion the orbit rests with the dot at the top and
 * the ring material + caption word carry the identical
 * meaning statically.
 */
/** R23 amended map: a null word means NO caption renders -
 *  the state is carried by the ring, not by a word. The
 *  nearby tier (WS-23-5) joins the same one-word grammar -
 *  one state, one word, same form. */
const STONE_STATE_WORD: Record<"happening" | "nearby" | "loved" | "new" | "seen", string | null> = {
  happening: "Live",
  nearby: "Nearby",
  loved: null,
  new: "New",
  seen: null,
};

/** R23 two-tier glow: attention is earned only by the named
 *  triggers wired in this wave - happening (live) and loved
 *  (the viewer's close people). Everything else rests. */
function stoneGlowTier(state: "happening" | "nearby" | "loved" | "new" | "seen"): "attention" | "rest" {
  return state === "happening" || state === "loved" ? "attention" : "rest";
}
function MomentStones({
  rail,
  onSelf,
  onOpen,
  onBond,
}: {
  rail: StoryRailProjection;
  onSelf: () => void;
  /** R22 (WS-3): the whole rail entry — the viewer queue is
   *  built from the rail at open time, not from one story. */
  onOpen: (s: StoryRailProjection["stories"][number]) => void;
  /** Repair #21 (W-12): the anchor name is the bond door -
   *  tapping a person lands on the pair's shared stone. */
  onBond?: (personId: string, name: string) => void;
}) {
  return (
    <div className="c2s-stones" data-testid="c2-moment-stones">
      <div className="c2s-stone-cell">
        <button
          type="button"
          className="c2s-stone c2s-stone-self"
          data-state={rail.self.hasLiveStory ? "happening" : "quiet"}
          data-glow={rail.self.hasLiveStory ? "attention" : "rest"}
          data-testid="c2-stone-self"
          aria-label="Your moment"
          onClick={onSelf}
        >
          <span className="c2s-stone-ring" aria-hidden />
          <span className="c2s-stone-orbit" aria-hidden>
            <span className="c2s-stone-dot" />
          </span>
          <span className="c2s-stone-face">
            <StoneFace avatar={rail.self.avatar} mediaUrl={rail.self.story?.mediaUrl} />
          </span>
          <span className="c2s-stone-plus" aria-hidden>
            +
          </span>
        </button>
        <p className="c2s-stone-name">Your moment</p>
        <p className="c2s-stone-sub" data-testid="c2-stone-sub">
          {rail.self.hasLiveStory ? STONE_STATE_WORD.happening : "Add"}
        </p>
      </div>
      {rail.stories.map((story) => {
        const state = story.stoneState ?? (story.seen ? "seen" : "new");
        return (
          <div className="c2s-stone-cell" key={story.id}>
            {story.mediaUrl ? (
              <button
                type="button"
                className="c2s-stone"
                data-state={state}
                data-glow={stoneGlowTier(state)}
                data-warmth={state === "loved" ? "warm" : undefined}
                data-testid="c2-stone"
                aria-label={`${story.personName} moment`}
                onClick={() => onOpen(story)}
              >
                <span className="c2s-stone-ring" aria-hidden />
                <span className="c2s-stone-orbit" aria-hidden>
                  <span className="c2s-stone-dot" />
                </span>
                <span className="c2s-stone-face">
                  <StoneFace avatar={story.avatar} mediaUrl={story.mediaUrl} />
                </span>
              </button>
            ) : (
              <span
                className="c2s-stone"
                data-state={state}
                data-glow={stoneGlowTier(state)}
                data-warmth={state === "loved" ? "warm" : undefined}
                data-testid="c2-stone-nomedia"
                aria-label={`${story.personName} moment is not available to play`}
              >
                <span className="c2s-stone-ring" aria-hidden />
                <span className="c2s-stone-orbit" aria-hidden>
                  <span className="c2s-stone-dot" />
                </span>
                <span className="c2s-stone-face">
                  <StoneFace avatar={story.avatar} mediaUrl={story.mediaUrl} />
                </span>
              </span>
            )}
            {onBond && story.personId ? (
              <button
                type="button"
                className="c2s-stone-name c2s-stone-name-btn"
                data-testid="c2-stone-bond"
                onClick={() => onBond(story.personId!, story.personName)}
              >
                {story.personName}
              </button>
            ) : (
              <p className="c2s-stone-name">{story.personName}</p>
            )}
            <p className="c2s-stone-sub" data-testid="c2-stone-sub">
              {STONE_STATE_WORD[state] ?? ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Repair #21 (W-9 identity addendum) - a discovery row: a person
 * the viewer talks with who is not yet in their circle. Follow
 * is the real follows endpoint; the row re-renders from its
 * response (following / not), and a failed write changes
 * nothing. Interest follows people - places and interests have
 * no wiring today and are declared, never painted.
 */
function DiscoveryRow({
  person,
  bearer,
}: {
  person: NonNullable<HomeProjection["discovery"]>[number];
  bearer?: string;
}) {
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = following
        ? await unfollowUser(person.userId, bearer)
        : await followUser(person.userId, bearer);
      setFollowing(res.following === true);
    } catch {
      /* the row keeps the server's last truth */
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="c2s-discovery-row" data-testid="c2-discovery-row">
      <Avatar avatar={person.avatar} size={36} />
      <p className="c2s-card-line" style={{ flex: 1, margin: 0 }}>
        {person.name}
        <span className="c2s-discovery-sub">You talk with them</span>
      </p>
      <button
        type="button"
        className="c2s-card-action"
        data-testid="c2-discovery-follow"
        aria-pressed={following}
        disabled={busy}
        onClick={() => void toggle()}
      >
        {following ? "Following" : "Follow"}
      </button>
    </div>
  );
}

/**
 * Share composer (section 7.2): one flow surface at flow band. Camera
 * and Photo library are real file inputs (capture opens the camera on
 * mobile hosts). Share uploads through the real media path, then calls
 * the real story or post endpoint. Failure keeps the draft, the media
 * and the caption on screen with one error line.
 */
function ShareComposer({
  kind,
  mediaFirst,
  allowToggle,
  bearer,
  onClose,
  onShared,
}: {
  kind: "story" | "post";
  /** W-17: media-first (photo/video door) or text-first (text
   *  door). Text-first is post-only - the story endpoint
   *  requires media by the server's own rule. */
  mediaFirst: boolean;
  /** W-17: the sheet's media door lets the SAME composer serve
   *  both destinations (Add to story / Add post) - a Story |
   *  Post switch inside, both endpoints real. The capability
   *  fallbacks open it locked to their kind, as before. */
  allowToggle: boolean;
  bearer?: string;
  onClose: () => void;
  onShared: () => void;
}) {
  const [destination, setDestination] = useState<"story" | "post">(kind);
  const [media, setMedia] = useState<{ base64: string; mime: string; preview: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  // Repair #23 (WS-23-2) - the audience is REAL state now, in the
  // server's own moment vocabulary (MOMENT_AUDIENCE_OPTIONS:
  // friends | specific_people | private - "close_circle" is a
  // story/live value and is never a moment value). The segment
  // follows the GoLiveFlow pattern; the label rendered is the
  // state value itself, and publish sends the state.
  const [audience, setAudience] = useState<MomentAudienceValue>("friends");
  const [audiencePeople, setAudiencePeople] = useState<Array<{ id: string; name: string }> | null>(
    null,
  );
  const [audiencePicked, setAudiencePicked] = useState<ReadonlySet<string>>(new Set());
  const [audiencePreview, setAudiencePreview] = useState<{ question: string; who: string } | null>(
    null,
  );
  const previewSeq = useRef(0);

  const pickedIds = audience === "specific_people" ? [...audiencePicked] : undefined;
  const pickedLabels =
    audience === "specific_people"
      ? (audiencePeople ?? [])
          .filter((p) => audiencePicked.has(p.id))
          .map((p) => p.name)
      : undefined;

  // The specific-people picker reads the viewer's own people
  // projection - the one people source the shell already uses
  // (listPeopleProjection, as in GroupMembership's add-people
  // sheet). Only account-backed people can be named in an
  // audience: audience_user_ids are user ids. No new endpoint.
  useEffect(() => {
    if (destination !== "post" || audience !== "specific_people" || audiencePeople !== null) return;
    let live = true;
    void (async () => {
      try {
        const res = await listPeopleProjection(bearer);
        if (!live) return;
        setAudiencePeople(
          (res.people ?? [])
            .filter((p) => p.account_backed)
            .map((p) => ({ id: p.id, name: p.display_name || p.name })),
        );
      } catch {
        if (live) setAudiencePeople([]);
      }
    })();
    return () => {
      live = false;
    };
  }, [destination, audience, audiencePeople, bearer]);

  // Before publish, the composer asks the server's own preview
  // endpoint who can see this and renders its answer verbatim -
  // nothing about the audience is computed or claimed locally.
  useEffect(() => {
    if (destination !== "post") return;
    const seq = ++previewSeq.current;
    void (async () => {
      try {
        const res = await previewSocialMomentAudience(
          {
            visibility: audience,
            audience_user_ids: pickedIds,
            audience_labels: pickedLabels,
          },
          bearer,
        );
        if (previewSeq.current !== seq) return;
        setAudiencePreview({
          question: res.preview?.question ?? res.question ?? "Who can see this?",
          who: res.preview?.who_can_see ?? "",
        });
      } catch {
        if (previewSeq.current === seq) setAudiencePreview(null);
      }
    })();
    // pickedIds/pickedLabels are derived from audiencePicked +
    // audiencePeople each render; the effect keys on their content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, audience, audiencePicked, audiencePeople, bearer]);

  const toggleAudiencePerson = (id: string) => {
    setAudiencePicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const audienceBlock =
    destination === "post" ? (
      <>
        <div className="c2s-seg" role="group" aria-label="Audience">
          {MOMENT_AUDIENCE_OPTIONS.map((a) => (
            <button
              key={a.value}
              type="button"
              className="c2s-seg-btn"
              data-testid={`c2-composer-audience-${a.value}`}
              aria-pressed={audience === a.value}
              onClick={() => setAudience(a.value)}
            >
              {a.label}
            </button>
          ))}
        </div>
        {audience === "specific_people" ? (
          <div data-testid="c2-composer-audience-people">
            {audiencePeople === null ? (
              <p className="c2s-caption">Loading your people...</p>
            ) : audiencePeople.length === 0 ? (
              <p className="c2s-caption">
                No one to pick yet - people you know in Opal will appear here.
              </p>
            ) : (
              audiencePeople.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="c2s-sheet-row"
                  data-testid={`c2-composer-audience-person-${p.id}`}
                  aria-pressed={audiencePicked.has(p.id)}
                  onClick={() => toggleAudiencePerson(p.id)}
                >
                  {p.name}
                  {audiencePicked.has(p.id) ? " - Added" : ""}
                </button>
              ))
            )}
          </div>
        ) : null}
        {audiencePreview ? (
          <p className="c2s-caption" data-testid="c2-composer-audience-preview">
            {audiencePreview.question} {audiencePreview.who}
          </p>
        ) : null}
      </>
    ) : null;

  const audienceBlocksShare =
    destination === "post" && audience === "specific_people" && audiencePicked.size === 0;

  const pick = async (file: File | null) => {
    if (!file) return;
    const base64 = await fileToBase64(file);
    setMedia({ base64, mime: file.type || "image/jpeg", preview: URL.createObjectURL(file) });
    setError(null);
  };

  const share = async () => {
    if (sharing) return;
    if (mediaFirst && !media) return;
    if (!mediaFirst && !caption.trim()) return;
    setSharing(true);
    setError(null);
    try {
      let mediaId: string | undefined;
      if (media) {
        const uploaded = await uploadSocialMomentMedia(
          { base64: media.base64, mime_type: media.mime },
          bearer,
        );
        mediaId =
          (uploaded.media as { id?: string } | undefined)?.id ??
          (uploaded.media as { media_id?: string } | undefined)?.media_id;
      }
      if (destination === "story") {
        await createTemporaryStory(
          { media_id: mediaId, caption: caption.trim() || undefined, visibility: "friends" },
          bearer,
        );
      } else {
        // A caption-only post is lawful (the publish rule rejects
        // only an EMPTY post); media rides when present. The
        // audience segment's state is what publish sends: the
        // visibility always, and the picked audience_user_ids
        // for the specific-people choice.
        await publishSocialMoment(
          {
            caption: caption.trim() || undefined,
            media_ids: mediaId ? [mediaId] : [],
            visibility: audience,
            audience_user_ids: pickedIds,
          },
          bearer,
        );
      }
      onShared();
    } catch {
      setSharing(false);
      setError(
        destination === "story"
          ? "Could not share your story. Your draft is still here."
          : "Could not share your post. Your draft is still here.",
      );
    }
  };

  const destinationSwitch = allowToggle && mediaFirst ? (
    <div className="c2s-seg" role="group" aria-label="Destination">
      <button
        type="button"
        className="c2s-seg-btn"
        data-testid="c2-composer-dest-story"
        aria-pressed={destination === "story"}
        onClick={() => setDestination("story")}
      >
        Story
      </button>
      <button
        type="button"
        className="c2s-seg-btn"
        data-testid="c2-composer-dest-post"
        aria-pressed={destination === "post"}
        onClick={() => setDestination("post")}
      >
        Post
      </button>
    </div>
  ) : null;

  return (
    <TopLayer band="flow">
      <div className="c2s-flow" data-testid="c2-share-composer">
        <div className="c2s-entry-top">
          <button
            type="button"
            className="c2s-icon-btn"
            aria-label="Close"
            data-testid="c2-composer-close"
            onClick={onClose}
          >
            <IconClose />
          </button>
          <span style={{ fontWeight: 650 }}>{destination === "story" ? "Your story" : "New post"}</span>
          <span style={{ width: 44 }} />
        </div>
        <div className="c2s-entry-body">
          {destinationSwitch}
          {destination === "story" ? (
            <p className="c2s-caption">Temporary. Does not post a Memory or a Graph.</p>
          ) : null}
          {!mediaFirst ? (
            <>
              <input
                className="c2s-field"
                data-testid="c2-composer-caption"
                placeholder="Say it short."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
              {audienceBlock}
              {error ? (
                <p className="c2s-error-line" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                className="c2s-btn-primary"
                data-testid="c2-composer-share"
                disabled={sharing || !caption.trim() || audienceBlocksShare}
                onClick={() => void share()}
              >
                {sharing ? "Sharing" : "Share post"}
              </button>
            </>
          ) : !media ? (
            <>
              <button
                type="button"
                className="c2s-sheet-row"
                data-testid="c2-composer-camera"
                onClick={() => cameraRef.current?.click()}
              >
                <IconCamera /> Camera
              </button>
              <button
                type="button"
                className="c2s-sheet-row"
                data-testid="c2-composer-library"
                onClick={() => libraryRef.current?.click()}
              >
                <IconImage /> Photo library
              </button>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => void pick(e.target.files?.[0] ?? null)}
              />
              <input
                ref={libraryRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => void pick(e.target.files?.[0] ?? null)}
              />
            </>
          ) : (
            <>
              <div className="c2s-media-well" style={{ minHeight: 260 }}>
                <img src={media.preview} alt="" />
              </div>
              <input
                className="c2s-field"
                data-testid="c2-composer-caption"
                placeholder="Say it short."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
              {audienceBlock}
              {error ? (
                <p className="c2s-error-line" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                className="c2s-btn-primary"
                data-testid="c2-composer-share"
                disabled={sharing || audienceBlocksShare}
                onClick={() => void share()}
              >
                {sharing ? "Sharing" : destination === "story" ? "Share story" : "Share post"}
              </button>
            </>
          )}
        </div>
      </div>
    </TopLayer>
  );
}

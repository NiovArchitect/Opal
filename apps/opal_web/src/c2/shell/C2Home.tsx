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
import React, { useRef, useState } from "react";
import { TopLayer } from "../../opalUi/TopLayer";
import { OrbLockup } from "../../brand/orb/OrbMark";
import { PlanCardC2 } from "../PlanCardC2";
import {
  createTemporaryStory,
  publishSocialMoment,
  uploadSocialMomentMedia,
} from "../../api/productClient";
import type { HomeProjection, StoryRailProjection } from "./projections";
import {
  Avatar,
  EmptyBlock,
  IconActivity,
  IconCamera,
  IconClose,
  IconImage,
  IconSearch,
} from "./bits";

export type C2HomeEvents = {
  openYou: () => void;
  openSearch: () => void;
  openActivity: () => void;
  openGraph: (cardId: string) => void;
  feedAction: (cardId: string, actionId: string) => void;
  /** Called after a story or post really published, so the shell
   *  re-requests the Home projection and re-renders from it. */
  onShared: () => void;
  bearer?: string;
};

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
  const [composer, setComposer] = useState<null | "story" | "post">(null);
  const [viewer, setViewer] = useState<null | {
    personName: string;
    storyCount: number;
    mediaUrl: string;
    caption?: string | null;
  }>(null);
  const rail = projection.rail;

  const openSelf = () => {
    // Hunt-fix B-10: your own live story opens the viewer only when
    // the rail carries its media (the adapter never sets hasLiveStory
    // without media today); otherwise the tap goes to create — never
    // to an empty stage.
    if (rail.self.hasLiveStory) return;
    if (rail.capabilities.canPost && rail.capabilities.canStory) {
      setSheet("create");
    } else if (rail.capabilities.canStory) {
      setComposer("story");
    } else if (rail.capabilities.canPost) {
      setComposer("post");
    }
  };

  return (
    <div data-testid="c2-home">
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
        <StoryRail rail={rail} onSelf={openSelf} onOpen={(s) => setViewer(s)} />
        <div className="c2s-feed" data-testid="c2-feed">
          {projection.feedError ? (
            <EmptyBlock
              testId="c2-feed-error"
              headline="Your feed did not load."
              line={projection.feedError}
              actionLabel="Try again"
              onAction={events.onShared}
            />
          ) : null}
          {projection.feed.length === 0 && !projection.feedError ? (
            <EmptyBlock
              testId="c2-feed-empty"
              headline="Nothing here yet."
              line="Posts from your people and your plans will show up here."
            />
          ) : (
            projection.feed.map((item) => {
              if (item.kind === "plan") {
                return (
                  <PlanCardC2
                    key={item.id}
                    input={item.card}
                    onOpen={() => events.openGraph(item.id)}
                  />
                );
              }
              if (item.kind === "memory") {
                return (
                  <article key={item.id} className="c2s-card" data-testid="c2-feed-memory">
                    <div className="c2s-media-well">
                      {item.photoUrl ? (
                        <img src={item.photoUrl} alt="" draggable={false} />
                      ) : (
                        <span>{item.contextLine}</span>
                      )}
                    </div>
                    <p className="c2s-card-title">{item.contextLine}</p>
                    <p className="c2s-card-line">{item.authorLine}</p>
                  </article>
                );
              }
              return (
                <article key={item.id} className="c2s-card" data-testid={`c2-feed-${item.kind}`}>
                  <p className="c2s-card-title">{item.title}</p>
                  <p className="c2s-card-line">{item.contextLine}</p>
                  <button
                    type="button"
                    className="c2s-card-action"
                    onClick={() => events.feedAction(item.id, item.actionId)}
                  >
                    {item.actionLabel}
                  </button>
                </article>
              );
            })
          )}
        </div>
      </div>

      {sheet === "create" ? (
        <TopLayer band="sheet">
          <div
            className="c2s-scrim"
            data-testid="c2-create-sheet"
            onClick={() => setSheet(null)}
          >
            <div
              className="c2s-sheet"
              role="dialog"
              aria-label="Share something"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="c2s-sheet-title">Share something</p>
              <button
                type="button"
                className="c2s-sheet-row"
                data-testid="c2-create-sheet-story"
                onClick={() => {
                  setSheet(null);
                  setComposer("story");
                }}
              >
                <IconCamera />
                <span>
                  Story
                  <small>Temporary. Gone in a day.</small>
                </span>
              </button>
              <button
                type="button"
                className="c2s-sheet-row"
                data-testid="c2-create-sheet-post"
                onClick={() => {
                  setSheet(null);
                  setComposer("post");
                }}
              >
                <IconImage />
                <span>
                  Post
                  <small>Stays on your Graph.</small>
                </span>
              </button>
              <button
                type="button"
                className="c2s-btn-text"
                data-testid="c2-create-sheet-cancel"
                onClick={() => setSheet(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </TopLayer>
      ) : null}

      {composer ? (
        <ShareComposer
          kind={composer}
          bearer={events.bearer}
          onClose={() => setComposer(null)}
          onShared={() => {
            setComposer(null);
            events.onShared();
          }}
        />
      ) : null}

      {viewer ? (
        <TopLayer band="flow">
          <div className="c2s-viewer" data-testid="c2-story-viewer">
            <div className="c2s-viewer-progress" aria-hidden>
              {Array.from({ length: Math.max(viewer.storyCount, 1) }).map((_, i) => (
                <span key={i} className="c2s-viewer-seg" data-done={i === 0 ? "1" : undefined} />
              ))}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px 0",
              }}
            >
              <span style={{ fontWeight: 650 }}>{viewer.personName}</span>
              <button
                type="button"
                className="c2s-icon-btn"
                aria-label="Close story"
                data-testid="c2-story-viewer-close"
                onClick={() => setViewer(null)}
              >
                <IconClose />
              </button>
            </div>
            <div className="c2s-viewer-media">
              {/\.(mp4|webm|mov|m4v)(\?|$)/i.test(viewer.mediaUrl) ? (
                <video
                  src={viewer.mediaUrl}
                  autoPlay
                  playsInline
                  data-testid="c2-story-viewer-media"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <img
                  src={viewer.mediaUrl}
                  alt={viewer.caption || `${viewer.personName} story`}
                  data-testid="c2-story-viewer-media"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
              {viewer.caption ? (
                <p className="c2s-viewer-caption" data-testid="c2-story-viewer-caption">
                  {viewer.caption}
                </p>
              ) : null}
            </div>
          </div>
        </TopLayer>
      ) : null}
    </div>
  );
}

function StoryRail({
  rail,
  onSelf,
  onOpen,
}: {
  rail: StoryRailProjection;
  onSelf: () => void;
  onOpen: (s: {
    personName: string;
    storyCount: number;
    mediaUrl: string;
    caption?: string | null;
  }) => void;
}) {
  return (
    <div className="c2s-rail" data-testid="c2-story-rail">
      <div className="c2s-story-cell">
        <button
          type="button"
          className="c2s-story-avatar-btn"
          data-ring="seen"
          data-testid="c2-story-self"
          aria-label="Your story"
          onClick={onSelf}
        >
          <span className="c2s-story-avatar-inner">
            {rail.self.avatar.photoUrl ? (
              <img src={rail.self.avatar.photoUrl} alt="" draggable={false} />
            ) : (
              rail.self.avatar.initials
            )}
          </span>
          <span className="c2s-story-plus" aria-hidden>
            +
          </span>
        </button>
        <p className="c2s-story-name">Your story</p>
        <p className="c2s-story-sub">
          {rail.self.hasLiveStory ? (rail.self.liveStoryLabel ?? "Live") : "Add"}
        </p>
        {rail.self.hasLiveStory ? <p className="c2s-story-sub">Add more</p> : null}
      </div>
      {rail.stories.map((story) => (
        <div className="c2s-story-cell" key={story.id}>
          {story.mediaUrl ? (
            <button
              type="button"
              className="c2s-story-avatar-btn"
              data-ring={story.ringKind}
              data-testid="c2-story-cell"
              aria-label={`${story.personName} story`}
              onClick={() =>
                onOpen({
                  personName: story.personName,
                  storyCount: story.storyCount,
                  mediaUrl: story.mediaUrl!,
                  caption: story.caption,
                })
              }
            >
              <span className="c2s-story-avatar-inner">
                {story.avatar.photoUrl ? (
                  <img src={story.avatar.photoUrl} alt="" draggable={false} />
                ) : (
                  story.avatar.initials
                )}
              </span>
            </button>
          ) : (
            <span
              className="c2s-story-avatar-btn"
              data-ring={story.ringKind}
              data-testid="c2-story-cell-nomedia"
              aria-label={`${story.personName} story is not available to play`}
            >
              <span className="c2s-story-avatar-inner">
                {story.avatar.photoUrl ? (
                  <img src={story.avatar.photoUrl} alt="" draggable={false} />
                ) : (
                  story.avatar.initials
                )}
              </span>
            </span>
          )}
          <p className="c2s-story-name">{story.personName}</p>
          <p className="c2s-story-sub">{story.seen ? "Seen" : "New"}</p>
        </div>
      ))}
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
  bearer,
  onClose,
  onShared,
}: {
  kind: "story" | "post";
  bearer?: string;
  onClose: () => void;
  onShared: () => void;
}) {
  const [media, setMedia] = useState<{ base64: string; mime: string; preview: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  const pick = async (file: File | null) => {
    if (!file) return;
    const base64 = await fileToBase64(file);
    setMedia({ base64, mime: file.type || "image/jpeg", preview: URL.createObjectURL(file) });
    setError(null);
  };

  const share = async () => {
    if (!media || sharing) return;
    setSharing(true);
    setError(null);
    try {
      const uploaded = await uploadSocialMomentMedia(
        { base64: media.base64, mime_type: media.mime },
        bearer,
      );
      const mediaId =
        (uploaded.media as { id?: string } | undefined)?.id ??
        (uploaded.media as { media_id?: string } | undefined)?.media_id;
      if (kind === "story") {
        await createTemporaryStory(
          { media_id: mediaId, caption: caption.trim() || undefined, visibility: "friends" },
          bearer,
        );
      } else {
        await publishSocialMoment(
          { caption: caption.trim() || undefined, media_ids: mediaId ? [mediaId] : [] },
          bearer,
        );
      }
      onShared();
    } catch {
      setSharing(false);
      setError(
        kind === "story"
          ? "Could not share your story. Your draft is still here."
          : "Could not share your post. Your draft is still here.",
      );
    }
  };

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
          <span style={{ fontWeight: 650 }}>{kind === "story" ? "Your story" : "New post"}</span>
          <span style={{ width: 44 }} />
        </div>
        <div className="c2s-entry-body">
          {kind === "story" ? (
            <p className="c2s-caption">Temporary. Does not post a Memory or a Graph.</p>
          ) : null}
          {!media ? (
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
              <p className="c2s-caption">
                Audience: Friends
              </p>
              {error ? (
                <p className="c2s-error-line" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                className="c2s-btn-primary"
                data-testid="c2-composer-share"
                disabled={sharing}
                onClick={() => void share()}
              >
                {sharing ? "Sharing" : kind === "story" ? "Share story" : "Share post"}
              </button>
            </>
          )}
        </div>
      </div>
    </TopLayer>
  );
}

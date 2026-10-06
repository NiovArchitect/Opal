/**
 * Save to… — pick an existing collection or create a named one.
 */
import React, { useEffect, useState } from "react";
import {
  createCollection,
  DEFAULT_COLLECTION_ID,
  loadCollections,
  type SavedCollection,
} from "./savedCollections";

type Props = {
  contentId: string;
  title?: string;
  onBack: () => void;
  onSaveTo: (collection: SavedCollection) => void;
};

export function SaveToCollectionSheet({ contentId, title, onBack, onSaveTo }: Props) {
  const [collections, setCollections] = useState<SavedCollection[]>(() => loadCollections());
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  return (
    <div
      className="save-to-collection-sheet"
      data-testid="save-to-collection-sheet"
      data-content-id={contentId}
      role="dialog"
      aria-modal="true"
      aria-label="Save to"
    >
      <header className="saved-browse-head">
        <button
          type="button"
          className="saved-browse-back"
          data-testid="save-to-back"
          aria-label="Close"
          onClick={onBack}
        >
          ←
        </button>
        <h2 className="saved-browse-title">Save to…</h2>
      </header>
      {title ? <p className="social-dest-lede">{title}</p> : null}

      <ul className="save-to-list" data-testid="save-to-list">
        {collections.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="save-to-row"
              data-testid={`save-to-${c.id}`}
              onClick={() => onSaveTo(c)}
            >
              {c.name}
              {c.id === DEFAULT_COLLECTION_ID ? (
                <span className="save-to-default">Default</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {!creating ? (
        <button
          type="button"
          className="save-to-new"
          data-testid="save-to-new"
          onClick={() => setCreating(true)}
        >
          New collection
        </button>
      ) : (
        <form
          className="save-to-create"
          data-testid="save-to-create"
          onSubmit={(e) => {
            e.preventDefault();
            const name = draft.trim();
            if (!name) return;
            const col = createCollection(name);
            setCollections(loadCollections());
            setDraft("");
            setCreating(false);
            onSaveTo(col);
          }}
        >
          <input
            className="save-to-input"
            data-testid="save-to-name-input"
            placeholder="Collection name (e.g. Date ideas)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="save-to-create-submit"
            data-testid="save-to-create-submit"
            disabled={!draft.trim()}
          >
            Create & save
          </button>
        </form>
      )}
    </div>
  );
}

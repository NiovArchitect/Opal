/**
 * Repair #21 (W-9 rebuild) - KNOW ME? TRIVIA, the living card on
 * Flows. Founder spec: polish-concepts.md as superseded by the
 * 2026-10-20 15:41 + 15:43 directives (recorded in
 * coordination/repair19/r21-openings-report.md).
 *
 * The hook is mutual knowing: do I know my friend - do they know
 * me? A ROUND is a small series, never one question: an opening
 * set of a few, then a couple more offered as a bonus multiplier
 * (score only), then the score. Both sides play: the answerer
 * gets brevity; the validator gets the reveal - seeing what their
 * friend said about them IS the reward.
 *
 * Truth-in-model, enforced here as in the backend:
 *  - questions are templates over records the viewer holds
 *    (built by shellData.buildTriviaQuestions - the scope law);
 *  - a guess is labeled a guess on its way to the subject, and
 *    only the subject's Right / Not quite validates it - no
 *    model anywhere confirms an answer;
 *  - validation enriches the SUBJECT's wallet server-side
 *    through the existing capsule path; this card only reads
 *    back the response (capsule_written) and says so plainly;
 *  - Repair #22 (WS-7) - "Not quite" is not a dead end: it opens
 *    an EDIT state in place, the claimed answer editable, and
 *    submitting the correction fixes the record server-side
 *    with provenance (the original claim is kept; who corrected,
 *    when, and to what rides the record). A corrected answer is
 *    scored as CORRECTED - never as if it had been right - and
 *    the guesser sees the correction on their own card;
 *  - the score is the inert ledger the server derives - no
 *    rewards, no discounts, nothing reads it but this line;
 *  - the game's natural exit is alignment: once knowing is
 *    proven, one quiet doorway into making a plan - a door,
 *    never an auto-created plan, never a push.
 */
import React, { useMemo, useState } from "react";
import {
  correctTriviaGuess,
  createMemoryCapsule,
  recordTriviaGuess,
  validateTriviaGuess,
} from "../../api/productClient";
import { Avatar } from "./bits";
import { avatarOf, pairScoreFromRecords } from "./shellData";
import type { HomeTrivia } from "./projections";

const OPENING_SET = 3;
const BONUS_SET = 2;

export function TriviaCard({
  trivia,
  bearer,
  onShared,
}: {
  trivia: HomeTrivia;
  bearer?: string;
  /** Re-read the Home projection after a real write. */
  onShared: () => void;
}) {
  const subjects = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const q of trivia.questions) {
      const cur = map.get(q.subjectUserId);
      if (cur) cur.count += 1;
      else map.set(q.subjectUserId, { id: q.subjectUserId, name: q.subjectName, count: 1 });
    }
    return [...map.values()];
  }, [trivia.questions]);

  // Repair #21 (T-5) - THE POSTER'S BUDDY: the pair who OWN
  // the card. Candidates are everyone the viewer has a trivia
  // truth with - question subjects, people they have guessed
  // about, people who have guessed about them - because the
  // poster must stand (face, pair line, pair score) even when
  // no round is currently open for that pair. Switching the
  // buddy re-owns the whole card: face, pair score and tease
  // all follow the selected pair (T-3, preserved).
  const buddies = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const s of subjects) map.set(s.id, { id: s.id, name: s.name });
    for (const g of trivia.mine) {
      if (g.subjectName) map.set(g.subjectUserId, { id: g.subjectUserId, name: g.subjectName });
    }
    for (const g of trivia.aboutMe) {
      if (g.guesserUserId && g.guesserName) {
        map.set(g.guesserUserId, { id: g.guesserUserId, name: g.guesserName });
      }
    }
    return [...map.values()];
  }, [subjects, trivia.mine, trivia.aboutMe]);

  const [pickedBuddy, setPickedBuddy] = useState<string | null>(null);
  // T-5: the resting poster carries the pair + the tease + the
  // play door; the round itself opens on entry (the game's
  // takeover begins). A buddy switch re-closes it - the new
  // pair's poster rests first.
  const [roundOpen, setRoundOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [bonusOpen, setBonusOpen] = useState(false);
  const [roundSent, setRoundSent] = useState<"opening" | "bonus" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatedNote, setValidatedNote] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [correction, setCorrection] = useState("");
  const [factDone, setFactDone] = useState(false);
  // Repair #22 (WS-7) - the "Not quite" edit state: which pending
  // guess is being corrected, and the editable draft. The draft
  // opens as the claimed answer itself, so the subject edits the
  // claim rather than retyping from nothing. Cancel clears both
  // and the card returns to its unmodified validation state -
  // no write of any kind has happened at that point.
  const [editingGuessId, setEditingGuessId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const pendingMine = trivia.mine.filter((g) => g.status === "pending");
  const pendingAboutMeAll = trivia.aboutMe.filter((g) => g.status === "pending");
  // The poster's default buddy: whoever is waiting on the
  // viewer first (their tease is the loudest), then the first
  // buddy in line. A picked buddy always wins.
  const defaultBuddyId =
    pendingAboutMeAll.find((g) => g.guesserUserId)?.guesserUserId ??
    buddies[0]?.id ??
    null;
  const subjectId =
    pickedBuddy && buddies.some((b) => b.id === pickedBuddy)
      ? pickedBuddy
      : defaultBuddyId;
  const buddy = buddies.find((b) => b.id === subjectId) ?? null;
  // The pair score - the SAME derivation the bond stone reads
  // (pairScoreFromRecords: validated pair guesses, 10 x
  // multiplier). One number, both surfaces (gyroscope rule).
  const pairScore = useMemo(() => {
    if (!subjectId) return null;
    const records = [
      ...trivia.mine.map((g) => ({
        guesserUserId: "viewer",
        subjectUserId: g.subjectUserId,
        status: g.status,
        multiplier: g.multiplier,
      })),
      ...trivia.aboutMe.map((g) => ({
        guesserUserId: g.guesserUserId,
        subjectUserId: "viewer",
        status: g.status,
        multiplier: g.multiplier,
      })),
    ];
    return pairScoreFromRecords(records, "viewer", subjectId);
  }, [trivia.mine, trivia.aboutMe, subjectId]);
  // Read-back law: a question with a guess already out is SPENT
  // until its subject answers - it leaves the round pool, and
  // the pending guess renders in the waiting list below, so the
  // card reads identically after a reload as it did on send.
  const spentFacts = new Set(
    pendingMine.map((g) => `${g.subjectUserId}::${g.question}`),
  );
  const pool = trivia.questions.filter(
    (q) =>
      q.subjectUserId === subjectId &&
      !spentFacts.has(`${q.subjectUserId}::${q.question}`),
  );
  const opening = pool.slice(0, OPENING_SET);
  const bonus = pool.slice(OPENING_SET, OPENING_SET + BONUS_SET);
  const pendingAboutMe = trivia.aboutMe.filter((g) => g.status === "pending");
  // T-5: the pair score line in the poster head replaces the
  // old global-score span - the score is the PAIR's (the same
  // derivation the bond reads), rendered on the pair line
  // whether or not the pair has confirmed a guess yet (the
  // names always render; the score segment only when real).
  // T-1: the card's light answers its state - a validation
  // waiting on YOU burns warmest; a round out with friends
  // breathes cool; an unplayed round runs the full spectacle.
  const lightState =
    pendingAboutMe.length > 0 ? "validation" : pendingMine.length > 0 ? "waiting" : "round";

  const submit = async (set: typeof opening, multiplier: number, leg: "opening" | "bonus") => {
    const answered = set.filter((q) => (answers[q.id] ?? "").trim());
    if (answered.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      for (const q of answered) {
        await recordTriviaGuess(
          {
            subjectUserId: q.subjectUserId,
            question: q.question,
            guess: answers[q.id].trim(),
            factSummary: q.factSummary,
            multiplier,
          },
          bearer,
        );
      }
      setRoundSent(leg);
      onShared();
    } catch {
      setError("Your guesses did not send. They are still here - try again.");
    } finally {
      setBusy(false);
    }
  };

  const validate = async (guessId: string, verdict: "right" | "wrong") => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await validateTriviaGuess(guessId, verdict, bearer);
      if (verdict === "right" && res.guess.capsule_written) {
        setValidatedNote("Saved to your memory - confirmed by you, in Know Me? Trivia.");
      } else if (verdict === "right") {
        setValidatedNote("Marked right. It counts in the score.");
      } else {
        setValidatedNote("Marked not quite. The guess stays a guess - nothing was saved as true.");
      }
      onShared();
    } catch {
      setError("That answer did not save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  // Repair #22 (WS-7) - submit the correction: the record is
  // fixed server-side with provenance, the corrected fact is
  // what enters the subject's wallet, and the guesser reads the
  // correction back from the same record on their own card.
  const submitCorrection = async (guessId: string) => {
    const value = editDraft.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await correctTriviaGuess(guessId, value, bearer);
      setEditingGuessId(null);
      setEditDraft("");
      if (res.guess.capsule_written) {
        setValidatedNote(
          "Corrected and saved to your memory. It counts as corrected - not as a right answer.",
        );
      } else {
        setValidatedNote("Corrected. It counts as corrected - not as a right answer.");
      }
      onShared();
    } catch {
      setError("That correction did not save. It is still here - try again.");
    } finally {
      setBusy(false);
    }
  };

  const confirmFact = async (value: string) => {
    const fact = trivia.aboutYouFact;
    if (!fact || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createMemoryCapsule(`${fact.label}: ${value}`, bearer, {
        source_kind: "trivia_validation",
        source_label: "You confirmed this in Know Me? Trivia",
        purpose: "trivia_validated_fact",
      });
      setFactDone(true);
      onShared();
    } catch {
      setError("That did not save to your memory. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (
    buddies.length === 0 &&
    pendingAboutMe.length === 0 &&
    !trivia.aboutYouFact &&
    trivia.mine.length === 0
  ) {
    return null;
  }

  // T-5 (3) - THE TEASE (the open loop: an unanswered thing
  // pulls; a description of a game does not). Truth binds it:
  // the pending-validation lure renders only from a REAL
  // pending guess by the buddy, and the face-down question
  // only from a REAL unplayed question in the pair's pool -
  // its opening words shown, the rest withheld under a blur.
  // (The principle: an open loop the reader cannot close from
  // the card's face - the Zeigarnik pull - is what makes a
  // still frame itch; the game itself stays one move below.)
  const buddyFirst = buddy ? buddy.name.split(" ")[0] : null;
  const buddyPending = pendingAboutMe.filter(
    (g) => g.guesserUserId && g.guesserUserId === subjectId,
  );
  const teaseQuestion = buddyPending.length === 0 && pool.length > 0 ? pool[0] : null;
  const teaseWords = teaseQuestion ? teaseQuestion.question.split(" ") : [];
  // Face-down: up to four words show, and at least the last
  // two are always withheld - a short question still keeps
  // its secret.
  const teaseVisible = Math.max(1, Math.min(4, teaseWords.length - 2));
  const teaseHead = teaseWords.slice(0, teaseVisible).join(" ");
  const teaseTail = teaseWords.slice(teaseVisible).join(" ");

  return (
    <article
      className="c2s-card c2s-trivia-card c2s-trivia-spectacle c2s-trivia-poster"
      data-testid="c2-trivia-card"
      data-light={lightState}
    >
      {/* T-5 (1)+(2) - THE POSTER HEAD: a stone-class berth,
          OWNED by a person. Face, light, name; the score
          ATTACHED TO THE PAIR ("You & Maya - 10 points - 1
          confirmed"), from the one pair derivation. The buddy
          chips are the inline friend switch (T-3): switching
          re-owns face, pair line, score and tease together. */}
      <div className="c2s-trivia-head">
        {buddies.length > 1 ? (
          <div className="c2s-trivia-buddies">
            {buddies.map((b) => (
              <button
                key={b.id}
                type="button"
                className="c2s-trivia-buddy"
                data-testid="c2-trivia-subject"
                data-active={b.id === subjectId ? "1" : undefined}
                aria-pressed={b.id === subjectId}
                aria-label={`Know Me? with ${b.name}`}
                onClick={() => {
                  setPickedBuddy(b.id);
                  setBonusOpen(false);
                  setRoundSent(null);
                  setRoundOpen(false);
                }}
              >
                <Avatar avatar={avatarOf(b.name, 1)} size={30} />
                <span>{b.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="c2s-trivia-owner">
          {buddy ? <Avatar avatar={avatarOf(buddy.name, 1)} size={44} /> : null}
          <div>
            <p className="c2s-card-title c2s-trivia-title" style={{ margin: 0 }}>
              Know Me?{buddyFirst ? ` - ${buddyFirst}` : ""}
            </p>
            <p className="c2s-trivia-pairline" data-testid="c2-trivia-score">
              {buddyFirst ? `You & ${buddyFirst}` : "You"}
              {pairScore
                ? ` - ${pairScore.points} points - ${pairScore.confirmed} confirmed`
                : ""}
            </p>
          </div>
        </div>
        {buddyPending.length > 0 && buddyFirst ? (
          <p className="c2s-trivia-tease" data-testid="c2-trivia-tease">
            {buddyFirst} answered one about you - see if {buddyFirst} knows you.
          </p>
        ) : teaseQuestion ? (
          <p className="c2s-trivia-tease" data-testid="c2-trivia-tease" aria-hidden>
            {teaseHead}{" "}
            <span className="c2s-trivia-masked">{teaseTail} …</span>
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="c2s-error-line" role="alert">
          {error}
        </p>
      ) : null}

      {pendingAboutMe.length > 0 ? (
        <section data-testid="c2-trivia-about-me">
          {pendingAboutMe.map((g) => (
            <div key={g.id} className="c2s-trivia-guess" data-testid="c2-trivia-validation">
              <p className="c2s-card-line" style={{ margin: 0 }}>
                {g.question}
              </p>
              <p style={{ margin: "4px 0" }}>
                {g.anonymous ? "A friend" : (g.guesserName ?? "A friend")} said:{" "}
                <strong>{g.guess}</strong>
              </p>
              {editingGuessId === g.id ? (
                /* Repair #22 (WS-7) - THE EDIT STATE, in place:
                   the card expands where it stands (no window,
                   no new surface) and the claimed answer is the
                   draft. Empty, whitespace, or unchanged drafts
                   cannot submit; Cancel returns to the
                   unmodified card with nothing written. */
                <div data-testid="c2-trivia-correction-edit">
                  <p className="c2s-card-line" style={{ margin: "4px 0" }}>
                    Not quite - what should it say instead?
                  </p>
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <input
                      className="c2s-field"
                      data-testid="c2-trivia-correction-input"
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      placeholder="The right answer"
                      aria-label={`Your correction to: ${g.question}`}
                    />
                    <button
                      type="button"
                      className="c2s-card-action"
                      data-testid="c2-trivia-correction-save"
                      disabled={
                        busy || !editDraft.trim() || editDraft.trim() === g.guess.trim()
                      }
                      onClick={() => void submitCorrection(g.id)}
                    >
                      Save correction
                    </button>
                    <button
                      type="button"
                      className="c2s-card-action"
                      data-testid="c2-trivia-correction-cancel"
                      disabled={busy}
                      onClick={() => {
                        setEditingGuessId(null);
                        setEditDraft("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                  <button
                    type="button"
                    className="c2s-btn-quiet"
                    data-testid="c2-trivia-correction-reject"
                    disabled={busy}
                    onClick={() => {
                      setEditingGuessId(null);
                      setEditDraft("");
                      void validate(g.id, "wrong");
                    }}
                  >
                    Just not quite - no correction
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button
                    type="button"
                    className="c2s-card-action"
                    data-testid="c2-trivia-validate-right"
                    disabled={busy}
                    onClick={() => void validate(g.id, "right")}
                  >
                    That is right
                  </button>
                  <button
                    type="button"
                    className="c2s-card-action"
                    data-testid="c2-trivia-validate-wrong"
                    disabled={busy}
                    onClick={() => {
                      setEditingGuessId(g.id);
                      setEditDraft(g.guess);
                    }}
                  >
                    Not quite
                  </button>
                </div>
              )}
            </div>
          ))}
          {validatedNote ? (
            <p className="c2s-card-line" data-testid="c2-trivia-validated-note">
              {validatedNote}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Repair #22 (WS-7) - THE CORRECTED STATE, both sides of
          the pair reading the ONE record. The subject reads back
          what they set right; the guesser learns their answer
          was corrected and to what (the reveal - a quiet line on
          the card, never a push). A corrected answer is named
          corrected, and it earns no points: it was not right as
          guessed. */}
      {trivia.aboutMe.some((g) => g.status === "corrected") ? (
        <section data-testid="c2-trivia-corrected-about">
          {trivia.aboutMe
            .filter((g) => g.status === "corrected")
            .map((g) => (
              <p key={g.id} className="c2s-card-line">
                You corrected {g.anonymous ? "a friend" : (g.guesserName ?? "a friend")}:
                they said {g.guess} - it is {g.correctedGuess ?? ""}.
              </p>
            ))}
        </section>
      ) : null}

      {trivia.mine.some((g) => g.status === "corrected") ? (
        <section data-testid="c2-trivia-corrected-mine">
          {trivia.mine
            .filter((g) => g.status === "corrected")
            .map((g) => (
              <p key={g.id} className="c2s-card-line">
                {g.subjectName ?? "They"} corrected your answer: you said {g.guess} - it
                is {g.correctedGuess ?? ""}. Corrected answers earn no points.
              </p>
            ))}
        </section>
      ) : null}

      {trivia.aboutYouFact && !factDone ? (
        <section data-testid="c2-trivia-about-you">
          <p className="c2s-card-line">
            Opal holds this about you: {trivia.aboutYouFact.label} - {trivia.aboutYouFact.value}.
            Is it right?
          </p>
          {correcting ? (
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <input
                className="c2s-field"
                data-testid="c2-trivia-correction"
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                placeholder="The right words"
                aria-label="Your correction"
              />
              <button
                type="button"
                className="c2s-card-action"
                disabled={busy || !correction.trim()}
                onClick={() => void confirmFact(correction.trim())}
              >
                Save it
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button
                type="button"
                className="c2s-card-action"
                data-testid="c2-trivia-fact-right"
                disabled={busy}
                onClick={() => void confirmFact(trivia.aboutYouFact!.value)}
              >
                That is right
              </button>
              <button
                type="button"
                className="c2s-card-action"
                data-testid="c2-trivia-fact-correct"
                disabled={busy}
                onClick={() => setCorrecting(true)}
              >
                Correct it
              </button>
            </div>
          )}
        </section>
      ) : null}

      {pendingMine.length > 0 ? (
        <section data-testid="c2-trivia-waiting">
          {pendingMine.map((g) => (
            <p key={g.id} className="c2s-card-line">
              You said {g.guess} - waiting for {g.subjectName ?? "them"} to say if
              it is right.
            </p>
          ))}
        </section>
      ) : null}

      {subjects.length > 0 && !roundOpen && (pool.length > 0 || roundSent !== null) ? (
        <button
          type="button"
          className="c2s-card-action c2s-trivia-play"
          data-testid="c2-trivia-play"
          onClick={() => setRoundOpen(true)}
        >
          Play
        </button>
      ) : null}

      {subjects.length > 0 && roundOpen ? (
        <section data-testid="c2-trivia-round">
          {/* T-5/T-3: the friend switch lives in the poster
              head now (the buddy chips) - this section is the
              round itself, for the pair who own the card. */}
          {opening.map((q) => (
            <div key={q.id} className="c2s-trivia-question">
              <p className="c2s-card-line">{q.question}</p>
              <input
                className="c2s-field"
                data-testid="c2-trivia-answer"
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                placeholder="Your guess"
                aria-label={q.question}
              />
            </div>
          ))}
          {opening.length === 0 && roundSent === null ? null : roundSent === null ? (
            <>
              <button
                type="button"
                className="c2s-btn-quiet"
                data-testid="c2-trivia-send"
                disabled={busy || !opening.some((q) => (answers[q.id] ?? "").trim())}
                onClick={() => void submit(opening, 1, "opening")}
              >
                Send my guesses
              </button>
            </>
          ) : (
            <p className="c2s-card-line" data-testid="c2-trivia-sent">
              Sent.
            </p>
          )}
          {roundSent === "opening" && bonus.length > 0 && !bonusOpen ? (
            <button
              type="button"
              className="c2s-card-action"
              data-testid="c2-trivia-bonus-open"
              onClick={() => setBonusOpen(true)}
            >
              A couple more? Right answers count double.
            </button>
          ) : null}
          {bonusOpen && roundSent !== "bonus"
            ? bonus.map((q) => (
                <div key={q.id} className="c2s-trivia-question">
                  <p className="c2s-card-line">{q.question} (double points)</p>
                  <input
                    className="c2s-field"
                    data-testid="c2-trivia-answer-bonus"
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="Your guess"
                    aria-label={q.question}
                  />
                </div>
              ))
            : null}
          {bonusOpen && roundSent !== "bonus" ? (
            <button
              type="button"
              className="c2s-btn-quiet"
              data-testid="c2-trivia-send-bonus"
              disabled={busy || !bonus.some((q) => (answers[q.id] ?? "").trim())}
              onClick={() => void submit(bonus, 2, "bonus")}
            >
              Send the bonus guesses
            </button>
          ) : null}
          {roundSent === "bonus" ? (
            <p className="c2s-card-line" data-testid="c2-trivia-bonus-sent">
              Bonus sent.
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Repair #21 charges (CF2-1) - DISPOSED: this card once
          carried an exit button labeled "Make something happen"
          wired to the shell's generic create opener (Center's
          CTA, threaded shell -> Home -> this card as onMakePlan).
          A game card's actions are the game's - the round and
          the pending validation. The create path was removed,
          not relabeled; creating starts from Center and from
          the seed doors, never from inside Trivia. */}
    </article>
  );
}

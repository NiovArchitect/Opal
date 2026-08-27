/**
 * OpalPromiseScreen  -  compatibility re-export.
 *
 * Critical path authority is FirstRunPromisePage (top-level viewport owner).
 * Do not nest Promise inside .fr-void / Motion / premember shell.
 */
export {
  FirstRunPromisePage as OpalPromiseScreen,
  FirstRunPromisePage,
  CANONICAL_PROMISE_SHA,
  CANONICAL_PROMISE_SHA_SHORT,
  PROMISE_NATIVE_WIDTH,
  PROMISE_NATIVE_HEIGHT,
  PROMISE_SRC,
} from "./FirstRunPromisePage";

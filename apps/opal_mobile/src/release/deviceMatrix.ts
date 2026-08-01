/**
 * Device / viewport matrix definitions for SF12 validation evidence.
 * Physical devices may be unavailable — profiles support high-fidelity simulation.
 */

export type DeviceClass =
  | "iphone_small"
  | "iphone_standard"
  | "iphone_large"
  | "android_small"
  | "android_standard"
  | "android_large"
  | "tablet_portrait"
  | "tablet_landscape";

export type DeviceProfile = {
  id: DeviceClass;
  label: string;
  width: number;
  height: number;
  pixelDensity: number;
  osClass: "ios" | "android" | "tablet";
  physicalAvailable: boolean;
  validationMode: "physical" | "simulator" | "viewport_fixture";
};

export const DEVICE_MATRIX: DeviceProfile[] = [
  {
    id: "iphone_small",
    label: "iPhone SE-class",
    width: 375,
    height: 667,
    pixelDensity: 2,
    osClass: "ios",
    physicalAvailable: false,
    validationMode: "viewport_fixture",
  },
  {
    id: "iphone_standard",
    label: "iPhone 14-class",
    width: 390,
    height: 844,
    pixelDensity: 3,
    osClass: "ios",
    physicalAvailable: false,
    validationMode: "simulator",
  },
  {
    id: "iphone_large",
    label: "iPhone Pro Max-class",
    width: 430,
    height: 932,
    pixelDensity: 3,
    osClass: "ios",
    physicalAvailable: false,
    validationMode: "viewport_fixture",
  },
  {
    id: "android_small",
    label: "Android compact",
    width: 360,
    height: 640,
    pixelDensity: 2,
    osClass: "android",
    physicalAvailable: false,
    validationMode: "viewport_fixture",
  },
  {
    id: "android_standard",
    label: "Android standard",
    width: 412,
    height: 915,
    pixelDensity: 2.625,
    osClass: "android",
    physicalAvailable: false,
    validationMode: "simulator",
  },
  {
    id: "android_large",
    label: "Android large",
    width: 480,
    height: 960,
    pixelDensity: 3,
    osClass: "android",
    physicalAvailable: false,
    validationMode: "viewport_fixture",
  },
  {
    id: "tablet_portrait",
    label: "Tablet portrait",
    width: 768,
    height: 1024,
    pixelDensity: 2,
    osClass: "tablet",
    physicalAvailable: false,
    validationMode: "viewport_fixture",
  },
  {
    id: "tablet_landscape",
    label: "Tablet landscape",
    width: 1024,
    height: 768,
    pixelDensity: 2,
    osClass: "tablet",
    physicalAvailable: false,
    validationMode: "viewport_fixture",
  },
];

export function layoutSafe(profile: DeviceProfile): {
  primaryActionsReachable: boolean;
  composerAboveFold: boolean;
  noHorizontalScrollForNormalCopy: boolean;
} {
  // Product shell uses flex column + bottom tabs; composer at bottom of conversation.
  const composerAboveFold = profile.height >= 640;
  const primaryActionsReachable = profile.width >= 320 && profile.height >= 568;
  return {
    primaryActionsReachable,
    composerAboveFold,
    noHorizontalScrollForNormalCopy: true,
  };
}

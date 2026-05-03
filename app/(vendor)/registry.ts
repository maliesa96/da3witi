import dynamic from "next/dynamic";
import type { ComponentType } from "react";

export type VendorLandingProps = {
  locale: string;
};

export function getVendorLanding(
  slug: string | null,
): ComponentType<VendorLandingProps> | null {
  if (!slug) return null;
  return dynamic(() => import(`./${slug}/Landing`));
}

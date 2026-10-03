import type {
  ComponentType,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  Ref,
} from "react";
import type { Placement } from "@floating-ui/react";

/** Custom tips wrap one trigger and must preserve its events, ref and accessibility props. */
export interface AutoTipProps {
  content: ReactNode;
  children: ReactElement<
    HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }
  >;
  placement?: Placement;
}

export type TipComponent = ComponentType<AutoTipProps>;

export interface TipConfig {
  /** Local component wins over provider config, then the built-in floating tip. */
  tipComponent?: TipComponent;
}

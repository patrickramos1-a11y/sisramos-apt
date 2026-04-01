import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const SMALL_MOBILE_BREAKPOINT = 375;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useIsSmallMobile() {
  const [isSmall, setIsSmall] = React.useState<boolean>(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${SMALL_MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsSmall(window.innerWidth < SMALL_MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsSmall(window.innerWidth < SMALL_MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isSmall;
}

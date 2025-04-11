/* istanbul ignore file */
import Image from "next/image";
import {cn} from "@/lib/utils";

type Props = {
  size?: "sm" | "lg";
  className?: string;
  logoOnly?: boolean;
};

const Logo = ({ size = "sm", className, logoOnly = false }: Props) => {
  const height = size === "sm" ? 40 : 150;
  const width = size === "sm" ? 40 : 150;
  return (
      <div
          className={cn(
              "flex items-center justify-center",
              {
                "gap-x-3 md:gap-x-4": size === "lg",
                "gap-x-1 md:gap-x-2": size === "sm",
              },
              className
          )}
      >
        <div
            className={cn({
              "w-24 md:w-auto": size === "lg",
              "w-14 md:w-auto": size === "sm",
            })}
        >
          <Image
              src={"/images/basejump-logo.png"}
              height={height}
              width={width}
              alt="Basejump Logo"
          />
        </div>
          {!logoOnly && (
        <h1
            className={cn("font-black", {
              "text-3xl md:text-8xl": size === "lg",
              "text-2xl": size === "sm",
            })}
        >
          Basejump
        </h1>)}
      </div>
  );
};

export default Logo;

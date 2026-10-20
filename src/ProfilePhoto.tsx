import { useEffect, useState } from "react";
import { getEmployeePhoto } from "./api";
import type { PhotoScope } from "./api";
import { initials } from "./workspace";

export default function ProfilePhoto({
  name,
  membershipId,
  version,
  scope,
  className = "",
  preview,
}: {
  name: string;
  membershipId: string;
  version?: string | null;
  scope?: PhotoScope;
  className?: string;
  preview?: string | null;
}) {
  const [photo, setPhoto] = useState<{
    key: string;
    dataUrl: string | null;
  } | null>(null);
  const key = `${scope?.token}:${scope?.org}:${membershipId}:${version}`;
  useEffect(() => {
    if (!scope || !version) return;
    const controller = new AbortController();
    void getEmployeePhoto(
      scope.token,
      scope.org,
      membershipId,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted)
          setPhoto({ key, dataUrl: result.dataUrl });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [key]);
  const src =
    preview !== undefined
      ? preview
      : version && photo?.key === key
        ? photo.dataUrl
        : null;
  return (
    <span className={`profile-photo ${className}`}>
      {src ? (
        <img src={src} alt="" onError={() => setPhoto(null)} />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}

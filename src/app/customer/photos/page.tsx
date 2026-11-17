"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type CustomerPackage = {
  id: string;
  sky_code: string | null;
  package_code: string | null;
  carrier_tracking_number: string | null;
  tracking_number: string | null;
  status: string | null;
};

type PackagePhoto = {
  id: string;
  package_id: string;
  storage_path: string;
  photo_type: string;
  caption: string | null;
  created_at: string;
};

type GalleryPhoto = PackagePhoto & {
  signed_url: string | null;
};

type GalleryPackage = CustomerPackage & {
  photos: GalleryPhoto[];
};

const BUCKET = "package-photos";

const PHOTO_LABELS: Record<string, string> = {
  package: "Package Photo",
  label: "Shipping Label",
  weight: "Package Weight",
  damage: "Damage Documentation",
  other: "Additional Photo",
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString();
}

function getPhotoLabel(type: string) {
  return (
    PHOTO_LABELS[type] ||
    type.replace(/_/g, " ")
  );
}

function getPackageCode(pkg: CustomerPackage) {
  return (
    pkg.sky_code ||
    pkg.package_code ||
    "SkyShip Package"
  );
}

function getTracking(pkg: CustomerPackage) {
  return (
    pkg.carrier_tracking_number ||
    pkg.tracking_number ||
    "Tracking not recorded"
  );
}

export default function CustomerPhotosPage() {
  const router = useRouter();

  const [packages, setPackages] = useState<
    GalleryPackage[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const [selectedPhoto, setSelectedPhoto] =
    useState<GalleryPhoto | null>(null);

  const loadPhotos = useCallback(
    async (initial = false) => {
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");
      setWarning("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError || !profile) {
          throw new Error(
            "Unable to verify your customer account."
          );
        }

        if (profile.role !== "client") {
          router.replace("/dashboard");
          return;
        }

        // Only retrieve packages assigned to this customer.
        const {
          data: packageData,
          error: packageError,
        } = await supabase
          .from("packages")
          .select(
            "id, sky_code, package_code, carrier_tracking_number, tracking_number, status"
          )
          .eq("owner_id", user.id)
          .order("id", {
            ascending: false,
          });

        if (packageError) {
          throw packageError;
        }

        const customerPackages =
          (packageData || []) as CustomerPackage[];

        if (customerPackages.length === 0) {
          setPackages([]);
          return;
        }

        const packageIds = customerPackages.map(
          (pkg) => pkg.id
        );

        // Database RLS provides an additional
        // ownership and authorization check.
        const {
          data: photoData,
          error: photoError,
        } = await supabase
          .from("package_photos")
          .select(
            "id, package_id, storage_path, photo_type, caption, created_at"
          )
          .in("package_id", packageIds)
          .order("created_at", {
            ascending: false,
          });

        if (photoError) {
          throw photoError;
        }

        const photoRecords =
          (photoData || []) as PackagePhoto[];

        let unavailablePhotos = 0;

        // Private bucket: generate signed URLs rather
        // than exposing public storage URLs.
        const photosWithUrls: GalleryPhoto[] =
          await Promise.all(
            photoRecords.map(async (photo) => {
              // Storage policy requires the first
              // folder to be the package UUID.
              if (
                !photo.storage_path.startsWith(
                  `${photo.package_id}/`
                )
              ) {
                unavailablePhotos += 1;

                return {
                  ...photo,
                  signed_url: null,
                };
              }

              try {
                const {
                  data,
                  error: signedUrlError,
                } = await supabase.storage
                  .from(BUCKET)
                  .createSignedUrl(
                    photo.storage_path,
                    3600
                  );

                if (
                  signedUrlError ||
                  !data?.signedUrl
                ) {
                  unavailablePhotos += 1;

                  return {
                    ...photo,
                    signed_url: null,
                  };
                }

                return {
                  ...photo,
                  signed_url: data.signedUrl,
                };
              } catch {
                unavailablePhotos += 1;

                return {
                  ...photo,
                  signed_url: null,
                };
              }
            })
          );

        const galleryPackages: GalleryPackage[] =
          customerPackages
            .map((pkg) => ({
              ...pkg,
              photos: photosWithUrls.filter(
                (photo) =>
                  photo.package_id === pkg.id
              ),
            }))
            .filter(
              (pkg) => pkg.photos.length > 0
            );

        setPackages(galleryPackages);

        if (unavailablePhotos > 0) {
          setWarning(
            `${unavailablePhotos} photo(s) could not be loaded. Please refresh or contact SkyShip support.`
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load package photos."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void loadPhotos(true);
  }, [loadPhotos]);

  const totalPhotos = packages.reduce(
    (total, pkg) => total + pkg.photos.length,
    0
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f2f9ff] via-[#e2f2ff] to-[#c8e8fa] px-4 py-8 text-[#073a68]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href="/customer/dashboard"
            className="inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-sky-700 shadow-sm transition hover:bg-sky-50"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#0879c5] via-[#079cdd] to-[#065aab] p-7 text-white shadow-xl sm:p-9">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-4xl">
              📷
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white/75">
                SkyShip Customer Services
              </p>

              <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                Package Photos
              </h1>

              <p className="mt-2 text-sm text-white/85">
                Secure photos of your shipments
                from our warehouses.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-sky-200 bg-white/90 p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">
                Your Photo Gallery
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                {totalPhotos}{" "}
                {totalPhotos === 1
                  ? "photo"
                  : "photos"}{" "}
                across {packages.length}{" "}
                {packages.length === 1
                  ? "shipment"
                  : "shipments"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadPhotos()}
              disabled={loading || refreshing}
              className="rounded-xl bg-[#0879c5] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0669ad] disabled:opacity-50"
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh Photos"}
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p className="font-bold">
                Unable to load package photos
              </p>

              <p className="mt-2 break-words">
                {error}
              </p>
            </div>
          )}

          {warning && (
            <div
              role="status"
              className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
            >
              {warning}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />

              <p className="mt-5 font-semibold text-slate-600">
                Loading your package photos...
              </p>
            </div>
          ) : packages.length === 0 && !error ? (
            <div className="mt-7 rounded-2xl border border-dashed border-sky-300 bg-[#f5fbff] px-6 py-16 text-center">
              <div className="text-5xl">
                📦
              </div>

              <h3 className="mt-5 text-xl font-black">
                No Package Photos Yet
              </h3>

              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">
                Photos of your shipments will appear
                here once they are uploaded by our
                warehouse team.
              </p>

              <Link
                href="/customer/dashboard"
                className="mt-6 inline-flex rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white hover:bg-sky-700"
              >
                View My Packages
              </Link>
            </div>
          ) : (
            <div className="mt-7 space-y-7">
              {packages.map((pkg) => (
                <section
                  key={pkg.id}
                  className="overflow-hidden rounded-2xl border border-sky-200 bg-[#f8fcff]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sky-200 bg-[#e8f5ff] p-5">
                    <div>
                      <h3 className="break-all text-xl font-black text-[#0879c5]">
                        {getPackageCode(pkg)}
                      </h3>

                      <p className="mt-2 break-all text-sm text-slate-600">
                        Tracking: {getTracking(pkg)}
                      </p>
                    </div>

                    <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-sky-800">
                      {pkg.photos.length}{" "}
                      {pkg.photos.length === 1
                        ? "Photo"
                        : "Photos"}
                    </span>
                  </div>

                  <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pkg.photos.map((photo) => (
                      <article
                        key={photo.id}
                        className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm"
                      >
                        {photo.signed_url ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPhoto(photo)
                            }
                            className="block w-full bg-slate-100"
                            title="View larger photo"
                          >
                            <img
                              src={photo.signed_url}
                              alt={
                                photo.caption ||
                                getPhotoLabel(
                                  photo.photo_type
                                )
                              }
                              className="h-56 w-full object-contain transition hover:scale-[1.02]"
                            />
                          </button>
                        ) : (
                          <div className="flex h-56 items-center justify-center bg-slate-100 p-5 text-center text-sm text-slate-500">
                            Photo unavailable
                          </div>
                        )}

                        <div className="p-4">
                          <span className="inline-flex rounded-full bg-sky-100 px-3 py-2 text-xs font-bold text-sky-700">
                            {getPhotoLabel(
                              photo.photo_type
                            )}
                          </span>

                          {photo.caption && (
                            <p className="mt-3 break-words text-sm font-medium text-slate-700">
                              {photo.caption}
                            </p>
                          )}

                          <p className="mt-3 text-xs text-slate-500">
                            Uploaded:{" "}
                            {formatDate(
                              photo.created_at
                            )}
                          </p>

                          {photo.signed_url && (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedPhoto(photo)
                              }
                              className="mt-4 text-sm font-bold text-sky-700 hover:underline"
                            >
                              View Photo
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        <div className="mt-6 rounded-2xl border border-sky-200 bg-white/75 p-5">
          <h3 className="font-black text-[#073a68]">
            Your Photos Are Private
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your gallery is limited to photos
            associated with your SkyShip account.
            Images are accessed through temporary,
            authorized storage links.
          </p>
        </div>

        <footer className="mt-8 text-center text-xs font-semibold text-slate-500">
          SkyShip LLC • Beyond Limits. Delivered.
        </footer>
      </div>

      {selectedPhoto?.signed_url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Package photo preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4"
        >
          <div className="relative w-full max-w-5xl">
            <button
              type="button"
              onClick={() =>
                setSelectedPhoto(null)
              }
              className="mb-4 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-800"
            >
              Close Photo
            </button>

            <img
              src={selectedPhoto.signed_url}
              alt={
                selectedPhoto.caption ||
                getPhotoLabel(
                  selectedPhoto.photo_type
                )
              }
              className="max-h-[75vh] w-full rounded-xl bg-white object-contain"
            />

            {selectedPhoto.caption && (
              <p className="mt-4 text-center text-sm text-white">
                {selectedPhoto.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
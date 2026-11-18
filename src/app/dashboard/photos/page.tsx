"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type PhotoType =
  | "package"
  | "label"
  | "weight"
  | "damage"
  | "other";

type PackageRecord = {
  id: string;
  sky_code: string | null;
  package_code: string | null;
  carrier_tracking_number: string | null;
  tracking_number: string | null;
  carrier: string | null;
  status: string | null;
  owner_id: string | null;
};

type PhotoRecord = {
  id: string;
  storage_path: string;
  photo_type: string;
  caption: string | null;
  created_at: string;
};

const BUCKET = "package-photos";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const PHOTO_TYPES: {
  value: PhotoType;
  label: string;
}[] = [
  { value: "package", label: "Package Photo" },
  { value: "label", label: "Shipping Label" },
  { value: "weight", label: "Package Weight" },
  { value: "damage", label: "Damage Documentation" },
  { value: "other", label: "Other Photo" },
];

const inputStyle =
  "w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

function getPackageCode(pkg: PackageRecord) {
  return (
    pkg.sky_code ||
    pkg.package_code ||
    "Package code unavailable"
  );
}

function getTracking(pkg: PackageRecord) {
  return (
    pkg.carrier_tracking_number ||
    pkg.tracking_number ||
    "Not recorded"
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString();
}

export default function AdminPackagePhotosPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState("");

  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [selectedPackage, setSelectedPackage] =
    useState<PackageRecord | null>(null);

  const [customerName, setCustomerName] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [photoType, setPhotoType] =
    useState<PhotoType>("package");
  const [caption, setCaption] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [existingPhotos, setExistingPhotos] =
    useState<PhotoRecord[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkAuthorization() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (error || !user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!active) return;

        if (profileError || !profile) {
          setAuthError(
            "Unable to verify your staff account."
          );
          return;
        }

        const allowedRoles = [
          "admin",
          "staff",
          "staff2",
          "staff4",
        ];

        if (!allowedRoles.includes(String(profile.role))) {
          setAuthError(
            "This page is restricted to authorized SkyShip staff."
          );
          return;
        }

        setAuthorized(true);
      } catch (error) {
        if (active) {
          setAuthError(
            error instanceof Error
              ? error.message
              : "Unable to verify your account."
          );
        }
      } finally {
        if (active) setCheckingAuth(false);
      }
    }

    void checkAuthorization();

    return () => {
      active = false;
    };
  }, [router]);

  async function loadExistingPhotos(packageId: string) {
    setPhotosLoading(true);
    setPhotosError("");

    try {
      const { data, error } = await supabase
        .from("package_photos")
        .select(
          "id, storage_path, photo_type, caption, created_at"
        )
        .eq("package_id", packageId)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setExistingPhotos((data || []) as PhotoRecord[]);
    } catch (error) {
      setPhotosError(
        error instanceof Error
          ? error.message
          : "Unable to load existing photos."
      );
    } finally {
      setPhotosLoading(false);
    }
  }

  async function searchPackage(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (uploading || searching) return;

    const query = search.trim();

    if (!query) {
      setSearchError(
        "Enter a SKY-PKG code or tracking number."
      );
      return;
    }

    setSearching(true);
    setSearchError("");
    setSelectedPackage(null);
    setCustomerName("");
    setFiles([]);
    setCaption("");
    setPhotoType("package");
    setExistingPhotos([]);
    setPhotosError("");
    setUploadError("");
    setSuccessMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    try {
      const { data, error } = await supabase
        .from("packages")
        .select(
          "id, sky_code, package_code, carrier_tracking_number, tracking_number, carrier, status, owner_id"
        )
        .or(
          [
            `sky_code.eq.${query}`,
            `package_code.eq.${query}`,
            `carrier_tracking_number.eq.${query}`,
            `tracking_number.eq.${query}`,
          ].join(",")
        )
        .limit(3);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        setSearchError(
          "No matching package found. Check the tracking number or SKY-PKG code."
        );
        return;
      }

      if (data.length > 1) {
        setSearchError(
          "Multiple packages match this search. Use the exact SKY-PKG code before uploading."
        );
        return;
      }

      const pkg = data[0] as PackageRecord;

      if (!pkg.owner_id) {
        setSearchError(
          "This package has no linked customer account. Assign its owner before uploading customer-visible photos."
        );
        return;
      }

      setSelectedPackage(pkg);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", pkg.owner_id)
        .maybeSingle();

      setCustomerName(
        profile?.full_name || "Customer name unavailable"
      );

      await loadExistingPhotos(pkg.id);
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : "Unable to search packages."
      );
    } finally {
      setSearching(false);
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setUploadError("");
    setSuccessMessage("");

    const selected = Array.from(
      event.target.files || []
    );

    if (selected.length === 0) {
      setFiles([]);
      return;
    }

    for (const file of selected) {
      if (!ALLOWED_TYPES[file.type]) {
        setUploadError(
          `Unsupported file: ${file.name}. Use JPEG, PNG, or WebP images.`
        );
        setFiles([]);
        event.target.value = "";
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setUploadError(
          `${file.name} exceeds the 10 MB limit.`
        );
        setFiles([]);
        event.target.value = "";
        return;
      }

      if (file.size === 0) {
        setUploadError(
          `${file.name} is empty and cannot be uploaded.`
        );
        setFiles([]);
        event.target.value = "";
        return;
      }
    }

    setFiles(selected);
  }

  async function uploadPhotos() {
    if (!authorized || uploading || !selectedPackage) {
      return;
    }

    if (files.length === 0) {
      setUploadError(
        "Select at least one photo before uploading."
      );
      return;
    }

    setUploading(true);
    setUploadError("");
    setSuccessMessage("");

    let uploadedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setUploadError(
          "Your session has expired. Please sign in again."
        );
        return;
      }

      const packageId = selectedPackage.id;
      const total = files.length;

      for (let index = 0; index < total; index++) {
        const file = files[index];

        setUploadProgress(
          `Uploading photo ${index + 1} of ${total}...`
        );

        const extension = ALLOWED_TYPES[file.type];

        const storagePath =
          `${packageId}/` +
          `${crypto.randomUUID()}.${extension}`;

        try {
          const { error: storageError } =
            await supabase.storage
              .from(BUCKET)
              .upload(storagePath, file, {
                contentType: file.type,
                upsert: false,
              });

          if (storageError) {
            throw storageError;
          }

          const { error: recordError } = await supabase
            .from("package_photos")
            .insert({
              package_id: packageId,
              storage_path: storagePath,
              photo_type: photoType,
              caption: caption.trim() || null,
              created_by: user.id,
            });

          if (recordError) {
            // Attempt to clean up a file if its
            // database record could not be saved.
            const { error: cleanupError } =
              await supabase.storage
                .from(BUCKET)
                .remove([storagePath]);

            if (cleanupError) {
              errors.push(
                `${file.name}: Database save failed. Storage cleanup also failed; manual review is required.`
              );
            }

            throw recordError;
          }

          uploadedCount += 1;
        } catch (error) {
          failedCount += 1;

          errors.push(
            `${file.name}: ${
              error instanceof Error
                ? error.message
                : "Upload failed"
            }`
          );
        }
      }

      if (uploadedCount > 0) {
        setSuccessMessage(
          `${uploadedCount} photo(s) uploaded successfully to ${getPackageCode(
            selectedPackage
          )}.`
        );
      }

      if (failedCount > 0) {
        setUploadError(
          `${failedCount} photo(s) could not be uploaded.\n${errors.join(
            "\n"
          )}`
        );
      }

      setFiles([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadExistingPhotos(packageId);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Unexpected upload error."
      );
    } finally {
      setUploadProgress("");
      setUploading(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-sky-50">
        <p className="font-semibold text-sky-800">
          Verifying SkyShip staff access...
        </p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-sky-50 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-black text-sky-800">
            Access Restricted
          </h1>

          <p className="mt-4 text-sm text-red-700">
            {authError ||
              "You are not authorized to use this page."}
          </p>

          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-xl bg-sky-600 px-5 py-3 font-bold text-white"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f2f9ff] via-white to-[#c8e8fa] px-4 py-8 text-[#073a68]">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="inline-flex rounded-xl border border-sky-200 bg-white px-5 py-3 text-sm font-bold text-sky-700 shadow-sm hover:bg-sky-50"
        >
          ← Back to Dashboard
        </Link>

        <section className="mt-6 rounded-3xl bg-gradient-to-r from-[#0879c5] via-[#079cdd] to-[#065aab] p-8 text-white shadow-lg">
          <p className="text-xs font-black uppercase tracking-widest text-white/75">
            SkyShip Warehouse Operations
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Package Photos Upload
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/90">
            Search for a shipment, confirm its customer,
            and securely upload photos for the customer's
            private Package Photos gallery.
          </p>
        </section>

        <section className="mt-6 rounded-3xl border border-sky-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">
            1. Find a Shipment
          </h2>

          <form
            onSubmit={searchPackage}
            className="mt-5 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Enter SKY-PKG code or tracking number"
              disabled={uploading || searching}
              className={`${inputStyle} flex-1`}
            />

            <button
              type="submit"
              disabled={uploading || searching}
              className="rounded-xl bg-sky-600 px-7 py-3 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {searching
                ? "Searching..."
                : "Search Shipment"}
            </button>
          </form>

          {searchError && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              {searchError}
            </div>
          )}

          {selectedPackage && (
            <div className="mt-6 rounded-2xl border border-sky-200 bg-[#eef8ff] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-600">
                Selected Shipment
              </p>

              <h3 className="mt-2 break-all text-2xl font-black">
                {getPackageCode(selectedPackage)}
              </h3>

              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">
                    Tracking Number
                  </p>
                  <p className="mt-1 break-all font-bold">
                    {getTracking(selectedPackage)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Customer
                  </p>
                  <p className="mt-1 font-bold">
                    {customerName}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Carrier
                  </p>
                  <p className="mt-1 font-bold">
                    {selectedPackage.carrier || "Not recorded"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Current Status
                  </p>
                  <p className="mt-1 font-bold">
                    {selectedPackage.status
                      ?.replace(/_/g, " ") ||
                      "Not recorded"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {selectedPackage && (
          <section className="mt-6 rounded-3xl border border-sky-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">
              2. Upload Package Photos
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Upload JPEG, PNG, or WebP images.
              Maximum 10 MB per photo.
            </p>

            <div className="mt-6">
              <label
                htmlFor="package-photo-files"
                className="mb-2 block text-sm font-bold"
              >
                Select Photos
              </label>

              <input
                id="package-photo-files"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={uploading}
                onChange={handleFileChange}
                className={`${inputStyle} file:mr-4 file:rounded-lg file:border-0 file:bg-sky-100 file:px-4 file:py-2 file:font-bold file:text-sky-700`}
              />

              {files.length > 0 && (
                <div className="mt-3 rounded-xl bg-sky-50 p-4 text-sm text-sky-800">
                  <p className="font-bold">
                    {files.length} photo(s) selected
                  </p>

                  <div className="mt-2 space-y-1">
                    {files.map((file, index) => (
                      <p
                        key={`${file.name}-${index}`}
                        className="break-all text-xs"
                      >
                        {file.name} —{" "}
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <label
                htmlFor="photo-type"
                className="mb-2 block text-sm font-bold"
              >
                Photo Category
              </label>

              <select
                id="photo-type"
                value={photoType}
                disabled={uploading}
                onChange={(event) =>
                  setPhotoType(
                    event.target.value as PhotoType
                  )
                }
                className={inputStyle}
              >
                {PHOTO_TYPES.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6">
              <label
                htmlFor="photo-caption"
                className="mb-2 block text-sm font-bold"
              >
                Caption (Optional)
              </label>

              <textarea
                id="photo-caption"
                value={caption}
                disabled={uploading}
                onChange={(event) =>
                  setCaption(event.target.value)
                }
                placeholder="Example: Package received at USA warehouse."
                rows={3}
                className={inputStyle}
              />
            </div>

            {uploadProgress && (
              <p
                role="status"
                className="mt-5 rounded-xl bg-sky-50 p-4 text-sm font-bold text-sky-800"
              >
                {uploadProgress}
              </p>
            )}

            {uploadError && (
              <div
                role="alert"
                className="mt-5 whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                {uploadError}
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-800"
              >
                {successMessage}
              </div>
            )}

            <button
              type="button"
              onClick={() => void uploadPhotos()}
              disabled={uploading || files.length === 0}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#06a9ee] to-[#087cdb] px-6 py-4 text-base font-black text-white shadow-lg hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading
                ? "Uploading Photos..."
                : `Upload ${files.length || ""} Photo${
                    files.length === 1 ? "" : "s"
                  }`}
            </button>
          </section>
        )}

        {selectedPackage && (
          <section className="mt-6 rounded-3xl border border-sky-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">
                  3. Uploaded Photo Records
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Photos currently associated with this shipment.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void loadExistingPhotos(
                    selectedPackage.id
                  )
                }
                disabled={photosLoading || uploading}
                className="rounded-xl border border-sky-300 bg-white px-4 py-3 text-sm font-bold text-sky-700 disabled:opacity-50"
              >
                Refresh Records
              </button>
            </div>

            {photosError && (
              <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {photosError}
              </p>
            )}

            {photosLoading ? (
              <p className="mt-5 text-sm text-slate-600">
                Loading photo records...
              </p>
            ) : existingPhotos.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-sky-300 bg-sky-50 p-8 text-center text-sm text-slate-600">
                No photos uploaded for this shipment yet.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {existingPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="rounded-xl border border-sky-100 bg-[#f8fcff] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-full bg-sky-100 px-3 py-2 text-xs font-bold capitalize text-sky-800">
                        {photo.photo_type}
                      </span>

                      <span className="text-xs text-slate-500">
                        {formatDate(photo.created_at)}
                      </span>
                    </div>

                    <p className="mt-3 break-all text-xs text-slate-600">
                      {photo.storage_path}
                    </p>

                    {photo.caption && (
                      <p className="mt-2 text-sm text-slate-700">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <footer className="mt-9 text-center text-xs font-semibold text-slate-500">
          SkyShip LLC • Beyond Limits. Delivered.
        </footer>
      </div>
    </main>
  );
}
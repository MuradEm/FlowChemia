import { PageHeader, useWorkspaceGuard } from "./WorkspaceContext";
import { useEffect, useRef, useState } from "react";
import brandIcon from "../design-kit/assets/flowchemia-icon-transparent.png";
import ProfilePhoto from "./ProfilePhoto";
import { Icon } from "./Icon";
import {
  ApiError,
  errorMessage,
  getEmployeeProfile,
  updateEmployeeProfile,
  updateEmployeePhoto,
  removeEmployeePhoto,
} from "./api";
import type {
  EmployeeProfile,
  Membership,
  ProfessionalInfo,
  Session,
} from "./api";
import { preparePhoto } from "./photo";

const fields: {
  key: keyof ProfessionalInfo;
  label: string;
  type?: string;
  max: number;
  placeholder: string;
}[] = [
  {
    key: "jobTitle",
    label: "Job title",
    max: 120,
    placeholder: "PLC Programmer",
  },
  {
    key: "department",
    label: "Department",
    max: 120,
    placeholder: "Automation Engineering",
  },
  {
    key: "location",
    label: "Location",
    max: 120,
    placeholder: "Berlin, Germany",
  },
  {
    key: "workEmail",
    label: "Work email",
    type: "email",
    max: 254,
    placeholder: "name@company.com",
  },
  {
    key: "workPhone",
    label: "Work phone",
    type: "tel",
    max: 50,
    placeholder: "+49 …",
  },
];
export default function EmployeeProfilePage({
  session,
  membership,
  employeeId,
  onBack,
  onExit,
  onExpired,
}: {
  session: Session;
  membership: Membership;
  employeeId: string;
  onBack: () => void;
  onExit: () => void;
  onExpired: () => void;
}) {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [form, setForm] = useState<ProfessionalInfo>({
    jobTitle: null,
    department: null,
    location: null,
    workEmail: null,
    workPhone: null,
  });
  const [preview, setPreview] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const alive = useRef(false),
    selection = useRef(0);
  const org = membership.organization.id;
  const scope = { token: session.token, org };
  const dirty =
    profile &&
    fields.some((f) => (form[f.key]?.trim() || null) !== profile[f.key]);
  const photoDirty = preview !== undefined;
  function accept(p: EmployeeProfile) {
    setProfile(p);
    setForm({
      jobTitle: p.jobTitle,
      department: p.department,
      location: p.location,
      workEmail: p.workEmail,
      workPhone: p.workPhone,
    });
  }
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    void getEmployeeProfile(session.token, org, employeeId, controller.signal)
      .then((p) => {
        if (alive.current && !controller.signal.aborted) accept(p);
      })
      .catch((f) => {
        if (alive.current && !controller.signal.aborted) {
          if (f instanceof ApiError && f.status === 401) onExpired();
          else setError(errorMessage(f));
        }
      })
      .finally(() => {
        if (alive.current && !controller.signal.aborted) setLoading(false);
      });
    return () => {
      alive.current = false;
      controller.abort();
      selection.current++;
    };
  }, [employeeId, org, session.token]);
  async function perform(
    action: () => Promise<EmployeeProfile>,
    message: string,
    photo = false,
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const p = await action();
      if (!alive.current) return;
      if (photo) {
        setProfile(p);
        setPreview(undefined);
      } else accept(p);
      setNotice(message);
    } catch (f) {
      if (!alive.current) return;
      if (f instanceof ApiError && f.status === 401) onExpired();
      else setError(errorMessage(f));
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function choose(file: File | undefined) {
    if (!file) return;
    const number = ++selection.current;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await preparePhoto(file);
      if (alive.current && number === selection.current) setPreview(data);
    } catch (f) {
      if (alive.current && number === selection.current)
        setError(
          f instanceof Error ? f.message : "This photo could not be opened.",
        );
    } finally {
      if (alive.current && number === selection.current) setBusy(false);
    }
  }
  useWorkspaceGuard(
    () =>
      !busy &&
      (!(dirty || photoDirty) ||
        window.confirm("Discard your unsaved profile changes?")),
  );
  function leave() {
    if (
      (dirty || photoDirty) &&
      !window.confirm("Discard your unsaved profile changes?")
    )
      return;
    onBack();
  }
  return (
    <div className="setup-page">
      <a className="skip-link" href="#profile-content">
        Skip to content
      </a>
      <PageHeader>
        <button className="brand setup-brand" onClick={leave}>
          <img src={brandIcon} alt="" />
          <span>
            Flow<span>Chemia</span>
          </span>
        </button>
        <nav aria-label="Profile navigation">
          <button className="text-button" onClick={leave} disabled={busy}>
            Back
          </button>
          <button className="text-button" onClick={onExit} disabled={busy}>
            Sign out
          </button>
        </nav>
      </PageHeader>
      <main id="profile-content" className="setup-content profile-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">{membership.organization.name} · PEOPLE</p>
            <h1>
              {employeeId === membership.id ? "My profile" : "Employee profile"}
              <span>.</span>
            </h1>
            <p>A little more about the person behind the work.</p>
          </div>
        </div>
        {loading && <p role="status">Loading employee profile…</p>}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="setup-success" role="status">
            {notice}
          </p>
        )}
        {profile && (
          <>
            <section className="profile-hero" aria-label="Employee identity">
              <ProfilePhoto
                name={profile.displayName}
                membershipId={employeeId}
                scope={scope}
                version={profile.photoUpdatedAt}
                preview={preview}
                className="profile-hero-portrait"
              />
              <div>
                <span className="profile-kicker">
                  {membership.organization.name}
                </span>
                <h2>{profile.displayName}</h2>
                <p className="profile-hero-title">
                  {profile.jobTitle || "Job title not added yet"}
                </p>
                <div className="profile-meta">
                  {profile.department && (
                    <span>
                      <Icon name="building" />
                      {profile.department}
                    </span>
                  )}
                  {profile.location && (
                    <span>
                      <Icon name="location" />
                      {profile.location}
                    </span>
                  )}
                </div>
                <span className="profile-company-pill">Company profile</span>
              </div>
              <img className="profile-brand-mark" src={brandIcon} alt="" />
            </section>
            <div className="profile-editor-grid">
              <section
                className="setup-panel photo-editor"
                aria-labelledby="photo-title"
              >
                <span className="round-icon teal">
                  <Icon name="camera" />
                </span>
                <h2 id="photo-title">Profile photo</h2>
                <p>
                  {profile.canEditPhoto
                    ? "Help your colleagues recognise you. Choose a clear photo of yourself."
                    : "Employees manage their own profile photos."}
                </p>
                {profile.canEditPhoto && (
                  <>
                    <label
                      className="photo-file-label"
                      htmlFor="employee-photo"
                    >
                      Choose a photo
                    </label>
                    <input
                      id="employee-photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={busy}
                      onChange={(e) => {
                        void choose(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    <p className="setup-note">
                      JPEG, PNG or WebP · up to 8 MB. Photos are cropped to a
                      square. Your preview appears above.
                    </p>
                    <div className="profile-photo-actions">
                      <button
                        className="primary-button"
                        disabled={busy || !photoDirty}
                        onClick={() =>
                          void perform(
                            () =>
                              preview === null
                                ? removeEmployeePhoto(
                                    session.token,
                                    org,
                                    employeeId,
                                  )
                                : updateEmployeePhoto(
                                    session.token,
                                    org,
                                    employeeId,
                                    preview!,
                                  ),
                            "Your profile photo was updated.",
                            true,
                          )
                        }
                      >
                        {busy ? "Working…" : "Save photo"}
                      </button>
                      {photoDirty && (
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => setPreview(undefined)}
                        >
                          Cancel photo change
                        </button>
                      )}
                      {(profile.photoUpdatedAt || preview) && (
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => setPreview(null)}
                        >
                          Remove photo
                        </button>
                      )}
                    </div>
                  </>
                )}
              </section>
              <section
                className="setup-panel"
                aria-labelledby="professional-title"
              >
                <span className="round-icon teal">
                  <Icon name="building" />
                </span>
                <h2 id="professional-title">Professional information</h2>
                <p>
                  {profile.canEditInfo
                    ? "Keep this employee’s role and work contact details up to date."
                    : "Your manager or HR can update your role and work contact details."}
                </p>
                {profile.canEditInfo ? (
                  <form
                    className="setup-form profile-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const changed = Object.fromEntries(
                        fields
                          .filter(
                            (f) =>
                              (form[f.key]?.trim() || null) !== profile[f.key],
                          )
                          .map((f) => [f.key, form[f.key]?.trim() || null]),
                      );
                      void perform(
                        () =>
                          updateEmployeeProfile(
                            session.token,
                            org,
                            employeeId,
                            changed,
                          ),
                        "Professional information was saved.",
                      );
                    }}
                  >
                    {fields.map((f) => (
                      <div key={f.key}>
                        <label htmlFor={`profile-${f.key}`}>{f.label}</label>
                        <input
                          id={`profile-${f.key}`}
                          type={f.type ?? "text"}
                          maxLength={f.max}
                          placeholder={f.placeholder}
                          value={form[f.key] ?? ""}
                          disabled={busy}
                          onChange={(e) =>
                            setForm({ ...form, [f.key]: e.target.value })
                          }
                        />
                      </div>
                    ))}
                    <p className="setup-note">
                      Work contact details appear to colleagues who can view
                      this company profile. Work email is separate from the
                      account’s sign-in email.
                    </p>
                    <div className="profile-form-actions">
                      <button
                        className="primary-button"
                        disabled={busy || !dirty}
                      >
                        {busy ? "Working…" : "Save professional information"}
                      </button>
                      {dirty && (
                        <button
                          className="text-button"
                          type="button"
                          disabled={busy}
                          onClick={() => accept(profile)}
                        >
                          Discard changes
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <dl className="profile-contact-list">
                    {fields.map((f) => (
                      <div key={f.key}>
                        <dt>{f.label}</dt>
                        <dd>{profile[f.key] || "Not added yet"}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

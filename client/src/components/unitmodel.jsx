
export default function AddUnitModal({
  isOpen,
  form,
  formError,
  saving,
  companyId,
  onClose,
  onSubmit,
  onChange,
  onTenantReadyChange,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className="modal-header">
          <div className="modal-title-icon">＋</div>

          <div className="modal-title-copy">
            <div className="eyebrow">PROPERTY DETAILS</div>
            <h2 id="modal-title">Add New Unit</h2>
            <p>Register a rental unit in your company workspace.</p>
          </div>

          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close dialog"
          >
            ×
          </button>
        </header>

        <form onSubmit={onSubmit} noValidate>
          <div className="form-section-title">UNIT INFORMATION</div>

          <div className="form-grid">
            <label className="form-field full-width">
              <span>
                Property name <b>*</b>
              </span>
              <input
                autoFocus
                name="propertyName"
                value={form.propertyName}
                onChange={onChange}
                placeholder="e.g. Lakeview Apartments"
              />
            </label>

            <label className="form-field">
              <span>Group / location (optional)</span>
              <input
                name="buildingNumber"
                value={form.buildingNumber}
                onChange={onChange}
                placeholder="e.g. Main property"
              />
            </label>

            <label className="form-field">
              <span>
                Unit number <b>*</b>
              </span>
              <input
                name="unitNumber"
                value={form.unitNumber}
                onChange={onChange}
                placeholder="e.g. 201"
              />
            </label>

            <label className="form-field">
              <span>
                Annual rent (₹) <b>*</b>
              </span>
              <input
                name="annualRent"
                type="number"
                min="0"
                step="0.01"
                value={form.annualRent}
                onChange={onChange}
                placeholder="e.g. 150000"
              />
            </label>

            <label className="form-field">
              <span>Unit status</span>
              <select
                name="status"
                value={form.status}
                onChange={onChange}
              >
                <option value="Vacant">Vacant</option>
                <option value="Occupied">Occupied</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </label>

            <label className="form-field">
              <span>Estimated repair cost (₹)</span>
              <input
                name="estimatedRepairCost"
                type="number"
                min="0"
                step="1"
                value={form.estimatedRepairCost}
                onChange={onChange}
                placeholder="0"
              />
            </label>

            <label className="form-field">
              <span>Estimated days to rent</span>
              <input
                name="estimatedDaysToRent"
                type="number"
                min="0"
                step="1"
                value={form.estimatedDaysToRent}
                onChange={onChange}
                placeholder="30"
              />
            </label>

            <label
              className="form-field full-width"
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <input
                name="tenantReady"
                type="checkbox"
                checked={Boolean(form.tenantReady)}
                onChange={(event) =>
                  onTenantReadyChange(event.target.checked)
                }
                style={{ width: "16px", height: "16px" }}
              />
              <span>Qualified prospective tenant ready</span>
            </label>
          </div>

          <div className="company-note">
            <span>◎</span>
            This unit will be registered under{" "}
            <strong>{companyId}</strong>.
          </div>

          {formError && (
            <div className="form-error" role="alert">
              <span className="error-symbol">!</span>
              <div>
                <strong>Unable to add unit</strong>
                <p>{formError}</p>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              className="primary-button"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Unit"}
              {!saving && <span>→</span>}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

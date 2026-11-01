
function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  })
}

export default function PortfolioSnapshot({
  loading,
  total,
  vacant,
  occupied,
  maintenance,
  topVacancyRecommendation,
  onViewUnits,
}) {
  const capacityPercentage = Math.min(total / 10, 1) * 100

  return (
    <article className="panel portfolio-panel">
      <div className="panel-heading">
        <div>
          <h2>Portfolio snapshot</h2>
          <p>Current unit occupancy status</p>
        </div>

        <button
          className="subtle-button"
          type="button"
          onClick={onViewUnits}
        >
          View units <span>→</span>
        </button>
      </div>

      <div className="occupancy-total">
        <div>
          <span className="muted-label">Registered units</span>
          <strong>{loading ? '—' : total}</strong>
        </div>
        <span className="occupancy-caption">Current status</span>
      </div>

      <div
        style={{
          margin: '18px 0 20px',
          padding: '16px',
          border: '1px solid #E8EDF3',
          borderRadius: '14px',
          background: '#FAFBFD',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
          }}
        >
          <div>
            <strong
              style={{
                display: 'block',
                fontSize: '14px',
                color: '#172033',
              }}
            >
              Unit capacity
            </strong>
            <span className="muted-label">Total portfolio limit</span>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <strong
              style={{
                display: 'block',
                fontSize: '20px',
                lineHeight: 1.2,
                color: '#172033',
              }}
            >
              {loading ? '—' : total}
              <span
                style={{
                  color: '#98A2B3',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                {' '}/ 10
              </span>
            </strong>
            <span className="muted-label">units registered</span>
          </div>
        </div>

        <div
          style={{
            height: '8px',
            background: '#E7ECF3',
            borderRadius: '99px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${capacityPercentage}%`,
              background: '#356AE6',
              borderRadius: '99px',
              transition: 'width 180ms ease',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '8px',
            color: '#7A8495',
            fontSize: '11px',
          }}
        >
          <span>
            {loading
              ? 'Loading units…'
              : `${Math.max(0, 10 - total)} spaces remaining`}
          </span>
          <span>10-unit maximum</span>
        </div>
      </div>

      <div className="occupancy-bar" aria-label="Unit status breakdown">
        <span
          className="bar-vacant"
          style={{
            width: `${total ? (vacant / total) * 100 : 0}%`,
          }}
        />
        <span
          className="bar-occupied"
          style={{
            width: `${total ? (occupied / total) * 100 : 0}%`,
          }}
        />
        <span
          className="bar-maintenance"
          style={{
            width: `${total ? (maintenance / total) * 100 : 0}%`,
          }}
        />
      </div>


<div className="legend-list">
  <div className="legend-item legend-vacant">
    <span className="legend-dot vacant-dot" />
    <span className="legend-label">Vacant</span>
    <strong>{loading ? '—' : vacant}</strong>
  </div>

  <div className="legend-item legend-occupied">
    <span className="legend-dot occupied-dot" />
    <span className="legend-label">Occupied</span>
    <strong>{loading ? '—' : occupied}</strong>
  </div>

  <div className="legend-item legend-maintenance">
    <span className="legend-dot maintenance-dot" />
    <span className="legend-label">Maintenance</span>
    <strong>{loading ? '—' : maintenance}</strong>
  </div>
</div>


      <div
        style={{
          marginTop: '20px',
          padding: '15px 16px',
          borderRadius: '12px',
          background: '#F5F8FF',
          border: '1px solid #E2EAFE',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              width: '25px',
              height: '25px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              background: '#E2EAFE',
              color: '#2859C5',
            }}
          >
            ✦
          </span>
          <strong style={{ fontSize: '13px', color: '#1D3262' }}>
            Owner recommendation
          </strong>
        </div>

        {loading ? (
          <p
            style={{
              margin: 0,
              color: '#667085',
              fontSize: '12px',
            }}
          >
            Reviewing your portfolio…
          </p>
        ) : topVacancyRecommendation ? (
          <>
            <p
              style={{
                margin: '0 0 7px',
                color: '#253858',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              Prioritize{' '}
              <strong>
                Unit {topVacancyRecommendation.unitNumber}
              </strong>{' '}
              for rental follow-up.
            </p>

            <p
              style={{
                margin: 0,
                color: '#667085',
                fontSize: '12px',
                lineHeight: 1.5,
              }}
            >
              {topVacancyRecommendation.tenantReady
                ? 'A prospective tenant is marked ready, so finalize checks and leasing first.'
                : `Vacant for ${topVacancyRecommendation.daysVacant} day${topVacancyRecommendation.daysVacant === 1 ? '' : 's'}; compare expected rent, repair cost and estimated time to rent before spending.`}
            </p>

            <p
              style={{
                margin: '8px 0 0',
                color: '#344054',
                fontSize: '11px',
              }}
            >
              Expected rent:{' '}
              {formatCurrency(
                topVacancyRecommendation.annualRent / 12
              )}
              /month · Repair estimate:{' '}
              {formatCurrency(topVacancyRecommendation.repairCost)}
            </p>
          </>
        ) : (
          <p
            style={{
              margin: 0,
              color: '#667085',
              fontSize: '12px',
              lineHeight: 1.5,
            }}
          >
            No vacant units right now. Keep occupied units stable and
            resolve any maintenance work.
          </p>
        )}
      </div>
    </article>
  )
}

'use client';
import React from 'react';

/**
 * Standardized, responsive MetricCard component.
 * Ensures consistent alignment, equal height, no text/icon collisions,
 * and predictable layout across all screen resolutions.
 */
export default function MetricCard({
  label,
  icon: Icon,
  iconBg = '#EFF6FF',
  iconColor = '#2563EB',
  value,
  valueColor = 'var(--text-primary)',
  status, // { online?: number, offline?: number } or custom ReactNode
  description, // helper description string or ReactNode
  subtext, // secondary highlighted info e.g. "47 Delivery Success Rate"
  badge,
  onClick
}) {
  return (
    <div
      className="metric-card-container"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      {/* Top Row: Label & Fixed-size Icon */}
      <div className="metric-card-header">
        <div className="metric-card-label" title={typeof label === 'string' ? label : undefined}>
          {label}
        </div>
        {Icon && (
          <div
            className="metric-card-icon"
            style={{
              background: iconBg,
              color: iconColor
            }}
            aria-hidden="true"
          >
            <Icon size={18} />
          </div>
        )}
      </div>

      {/* Middle Row: Dominant Primary Value */}
      <div className="metric-card-body">
        <div
          className="metric-card-value"
          style={{ color: valueColor }}
        >
          {value ?? 0}
        </div>
        {badge && (
          <span className="metric-card-badge">
            {badge}
          </span>
        )}
      </div>

      {/* Bottom Row: Status / Secondary Value / Description */}
      <div className="metric-card-footer">
        {status && typeof status === 'object' && ('online' in status || 'offline' in status) ? (
          <div className="metric-status-row">
            <span className="metric-status-pill online">
              <span className="metric-dot online" aria-hidden="true" />
              {status.online ?? 0} Online
            </span>
            <span className="metric-status-sep" aria-hidden="true">•</span>
            <span className={`metric-status-pill ${(status.offline ?? 0) > 0 ? 'offline' : 'neutral'}`}>
              <span className={`metric-dot ${(status.offline ?? 0) > 0 ? 'offline' : 'neutral'}`} aria-hidden="true" />
              {status.offline ?? 0} Offline
            </span>
          </div>
        ) : status ? (
          <div className="metric-status-custom">
            {status}
          </div>
        ) : null}

        {subtext && (
          <div className="metric-subtext">
            {subtext}
          </div>
        )}

        {description && (
          <div className="metric-description">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}

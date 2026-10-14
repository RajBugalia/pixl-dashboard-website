'use client';
import React from 'react';

/**
 * Standardized, responsive PageHeader component.
 * Provides identical spacing, alignment, and responsiveness
 * for eyebrow text, page title, status badge pills, description,
 * and right-side action buttons across all Master admin pages.
 */
export default function PageHeader({
  eyebrow,
  title,
  badges = [],
  description,
  actions
}) {
  return (
    <header className="master-page-header">
      <div className="master-header-left">
        {eyebrow && (
          <div className="master-header-eyebrow">
            <span className="master-eyebrow-dot" aria-hidden="true" />
            <span className="master-eyebrow-text">{eyebrow}</span>
          </div>
        )}

        <div className="master-header-title-row">
          <h1 className="master-page-title">{title}</h1>

          {badges.length > 0 && (
            <div className="master-header-badges">
              {badges.map((badge, idx) => (
                <span
                  key={idx}
                  className="master-status-badge"
                  style={{
                    background: badge.bg || '#EFF6FF',
                    color: badge.color || '#1D4ED8'
                  }}
                >
                  {badge.dotColor && (
                    <span
                      className="master-badge-dot"
                      style={{ background: badge.dotColor }}
                      aria-hidden="true"
                    />
                  )}
                  {badge.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {description && (
          <p className="master-page-description">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="master-header-actions">
          {actions}
        </div>
      )}
    </header>
  );
}

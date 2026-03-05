import React from "react";
import "../style/formField.css";

export default function FormField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error = "",
  helperText = "",
  options = [],
  icon = null,
  iconPosition = "left",
  ...props
}) {
  const renderInput = () => {
    const baseClasses = "form-field-input";
    const iconClasses = icon ? `form-field-with-icon form-field-icon-${iconPosition}` : "";
    const errorClasses = error ? "form-field-error" : "";
    const classes = `${baseClasses} ${iconClasses} ${errorClasses}`;

    if (type === "select") {
      return (
        <select
          className={classes}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          {...props}
        >
          <option value="" disabled>
            {placeholder || "Select an option"}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (type === "textarea") {
      return (
        <textarea
          className={classes}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          {...props}
        />
      );
    }

    return (
      <div className="form-field-input-wrapper">
        {icon && iconPosition === "left" && (
          <i className={`fa-solid ${icon} form-field-icon`}></i>
        )}
        <input
          className={classes}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          {...props}
        />
        {icon && iconPosition === "right" && (
          <i className={`fa-solid ${icon} form-field-icon`}></i>
        )}
      </div>
    );
  };

  return (
    <div className="form-field">
      {label && (
        <label className="form-field-label">
          {label}
          {required && <span className="form-field-required">*</span>}
        </label>
      )}
      
      <div className="form-field-input-container">
        {renderInput()}
        {error && (
          <div className="form-field-error-message">
            <i className="fa-solid fa-exclamation-circle"></i>
            {error}
          </div>
        )}
        {helperText && !error && (
          <div className="form-field-helper-text">{helperText}</div>
        )}
      </div>
    </div>
  );
}

// FormFieldGroup for organizing related fields
export function FormFieldGroup({ title, children, className = "" }) {
  return (
    <div className={`form-field-group ${className}`}>
      {title && <h3 className="form-field-group-title">{title}</h3>}
      <div className="form-field-group-content">{children}</div>
    </div>
  );
}

// FormFieldSection for larger sections
export function FormFieldSection({ title, description, children, className = "" }) {
  return (
    <div className={`form-field-section ${className}`}>
      {title && (
        <div className="form-field-section-header">
          <h2 className="form-field-section-title">{title}</h2>
          {description && (
            <p className="form-field-section-description">{description}</p>
          )}
        </div>
      )}
      <div className="form-field-section-content">{children}</div>
    </div>
  );
}

// FormFieldRow for horizontal layouts
export function FormFieldRow({ children, gap = "medium", className = "" }) {
  return (
    <div className={`form-field-row form-field-row-gap-${gap} ${className}`}>
      {children}
    </div>
  );
}

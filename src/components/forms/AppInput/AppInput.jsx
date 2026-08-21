import { useId } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import styles from './AppInput.module.scss';

// Single reusable control for every text-like field in the Product Creation flow —
// text/number/email/etc via <input>, or type="textarea" for multi-line. Select and
// checkbox inputs are out of scope; those keep their native elements.
const AppInput = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  readOnly = false,
  loading = false,
  success = false,
  error = '',
  helperText = '',
  prefixIcon: PrefixIcon,
  suffixIcon: SuffixIcon,
  maxLength,
  rows = 3,
  floating = false,
  fullWidth = true,
  className = '',
  ...rest
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hasError = Boolean(error);
  const stateClass = hasError ? styles.hasError : success ? styles.hasSuccess : '';
  const length = String(value ?? '').length;

  const sharedProps = {
    id: inputId,
    value: value ?? '',
    onChange,
    placeholder: floating ? ' ' : placeholder,
    required,
    disabled,
    readOnly,
    maxLength,
    'aria-invalid': hasError || undefined,
    'aria-describedby': error || helperText ? `${inputId}-hint` : undefined,
    ...rest,
  };

  return (
    <div
      className={[styles.field, fullWidth ? styles.fullWidth : '', floating ? styles.floating : '', stateClass, className]
        .filter(Boolean)
        .join(' ')}
    >
      {label && !floating ? (
        <label htmlFor={inputId}>
          {label}
          {required ? <span className={styles.required}>*</span> : null}
        </label>
      ) : null}

      <div className={styles.control}>
        {PrefixIcon ? (
          <span className={styles.prefix}>
            <PrefixIcon size={15} />
          </span>
        ) : null}

        {type === 'textarea' ? (
          <textarea rows={rows} className={[PrefixIcon ? styles.withPrefix : '', SuffixIcon || loading || success ? styles.withSuffix : ''].filter(Boolean).join(' ')} {...sharedProps} />
        ) : (
          <input
            type={type}
            className={[PrefixIcon ? styles.withPrefix : '', SuffixIcon || loading || success ? styles.withSuffix : ''].filter(Boolean).join(' ')}
            {...sharedProps}
          />
        )}

        {label && floating ? (
          <label htmlFor={inputId} className={styles.floatingLabel}>
            {label}
            {required ? <span className={styles.required}>*</span> : null}
          </label>
        ) : null}

        {loading ? (
          <span className={styles.suffix}>
            <Loader2 size={15} className={styles.spinner} />
          </span>
        ) : success ? (
          <span className={[styles.suffix, styles.successIcon].join(' ')}>
            <CheckCircle2 size={15} />
          </span>
        ) : SuffixIcon ? (
          <span className={styles.suffix}>
            <SuffixIcon size={15} />
          </span>
        ) : null}
      </div>

      {error || helperText || maxLength ? (
        <div className={styles.hint} id={`${inputId}-hint`}>
          <span className={hasError ? styles.errorText : styles.helperText}>{error || helperText || ''}</span>
          {maxLength ? (
            <span className={styles.counter}>
              {length}/{maxLength}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default AppInput;

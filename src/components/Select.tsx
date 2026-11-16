import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import './select.css';

type Option = { value: string; label: string; disabled: boolean };
type Props = {
  children: ReactNode;
  id?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
};
const normalize = (text: string) =>
  text
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

/** Shared single-value picker. The native control preserves FormData and validation. */
export function Select({
  children,
  id: inputId,
  value,
  defaultValue,
  onValueChange,
  name,
  required,
  disabled,
  'aria-label': label = 'Lựa chọn',
}: Props) {
  const options = Children.toArray(children).flatMap((child): Option[] => {
    if (
      !isValidElement<{
        value?: string;
        disabled?: boolean;
        children?: ReactNode;
      }>(child) ||
      child.type !== 'option'
    )
      return [];
    return [
      {
        value: String(child.props.value ?? Children.toArray(child.props.children).join('')),
        label: Children.toArray(child.props.children).join(''),
        disabled: !!child.props.disabled || (!!required && child.props.value === ''),
      },
    ];
  });
  const initial = defaultValue ?? options[0]?.value ?? '';
  const [internal, setInternal] = useState(initial);
  const current = value ?? internal;
  const selected = options.find((o) => o.value === current);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 240,
    height: 300,
    side: 'bottom',
  });
  const trigger = useRef<HTMLButtonElement>(null);
  const native = useRef<HTMLSelectElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const typeahead = useRef({ text: '', time: 0 });
  const id = useId();
  const searchEnabled = options.filter((o) => !o.disabled).length >= 5;
  const filtered = options.filter(
    (o) => !o.disabled && normalize(o.label).includes(normalize(query)),
  );

  function close(restoreFocus = false) {
    setOpen(false);
    setQuery('');
    if (restoreFocus) trigger.current?.focus();
  }
  function choose(option: Option) {
    if (option.disabled || disabled) return;
    if (value === undefined) setInternal(option.value);
    setInvalid(false);
    onValueChange?.(option.value);
    close(true);
  }
  function show(edge?: 'first' | 'last') {
    if (disabled || !options.some((o) => !o.disabled)) return;
    setQuery('');
    const enabled = options.filter((o) => !o.disabled);
    setActive(
      edge === 'first'
        ? enabled[0].value
        : edge === 'last'
          ? enabled.at(-1)!.value
          : (enabled.find((o) => o.value === current)?.value ?? enabled[0].value),
    );
    setOpen(true);
  }
  function handleKeys(e: KeyboardEvent<HTMLElement>) {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      e.stopPropagation();
      close(true);
      return;
    }
    if (e.key === 'Tab' && open) {
      e.stopPropagation();
      close(true);
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        show();
        return;
      }
      const index = filtered.findIndex((o) => o.value === active);
      const next =
        e.key === 'ArrowDown' ? Math.min(filtered.length - 1, index + 1) : Math.max(0, index - 1);
      if (filtered[next]) setActive(filtered[next].value);
    } else if ((e.key === 'Home' || e.key === 'End') && e.target !== search.current) {
      e.preventDefault();
      if (!open) show(e.key === 'Home' ? 'first' : 'last');
      else setActive((e.key === 'Home' ? filtered[0] : filtered.at(-1))?.value ?? '');
    } else if (e.key === 'Enter' || (e.key === ' ' && e.target !== search.current)) {
      e.preventDefault();
      if (!open) show();
      else {
        const option = filtered.find((o) => o.value === active);
        if (option) choose(option);
      }
    } else if (
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      e.target !== search.current
    ) {
      e.preventDefault();
      const now = Date.now();
      typeahead.current.text =
        now - typeahead.current.time > 700 ? e.key : typeahead.current.text + e.key;
      typeahead.current.time = now;
      const option = options.find(
        (o) =>
          !o.disabled &&
          (searchEnabled
            ? normalize(o.label).includes(normalize(typeahead.current.text))
            : normalize(o.label)
                .replace(/^\d+\.\s*/, '')
                .startsWith(normalize(typeahead.current.text))),
      );
      if (!open) show();
      if (searchEnabled) setQuery(typeahead.current.text);
      if (option) setActive(option.value);
    }
  }
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const below = innerHeight - rect.bottom - 16,
        above = rect.top - 16;
      const side = below < 230 && above > below ? 'top' : 'bottom';
      const height = Math.min(330, Math.max(100, side === 'top' ? above : below));
      const width = Math.min(Math.max(rect.width, 220), innerWidth - 24);
      setPosition({
        left: Math.max(12, Math.min(rect.left, innerWidth - width - 12)),
        top: side === 'top' ? rect.top - 7 : rect.bottom + 7,
        width,
        height,
        side,
      });
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    if (searchEnabled) search.current?.focus();
    let startedOutside = false;
    function outsideTarget(target: EventTarget | null) {
      return !menu.current?.contains(target as Node) && !trigger.current?.contains(target as Node);
    }
    function pointerStart(e: PointerEvent) {
      startedOutside = outsideTarget(e.target);
    }
    function outside(e: MouseEvent) {
      if (startedOutside && outsideTarget(e.target)) close();
    }
    document.addEventListener('pointerdown', pointerStart, true);
    document.addEventListener('click', outside, true);
    return () => {
      document.removeEventListener('pointerdown', pointerStart, true);
      document.removeEventListener('click', outside, true);
    };
  }, [open, searchEnabled]);
  useEffect(() => {
    if (disabled) close();
  }, [disabled]);
  useEffect(() => {
    if (open)
      menu.current
        ?.querySelector<HTMLElement>('[data-active="true"]')
        ?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);
  useEffect(() => {
    const form = native.current?.form;
    const reset = () => {
      if (value === undefined) setInternal(initial);
      setInvalid(false);
      close();
    };
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, [initial, value]);
  const activeId = filtered.some((o) => o.value === active)
    ? `${id}-option-${filtered.findIndex((o) => o.value === active)}`
    : undefined;
  return (
    <span className={`app-select ${open ? 'is-open' : ''} ${invalid ? 'is-invalid' : ''}`}>
      <button
        ref={trigger}
        id={inputId}
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-haspopup="listbox"
        aria-activedescendant={open && !searchEnabled ? activeId : undefined}
        aria-required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        disabled={disabled || !options.length}
        className={`app-select-trigger ${!current && required ? 'is-placeholder' : ''}`}
        onClick={() => (open ? close() : show())}
        onKeyDown={handleKeys}
      >
        <span>{selected?.label || 'Chọn một mục…'}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <select
        ref={native}
        className="app-select-native"
        name={name}
        value={current}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (value === undefined) setInternal(e.target.value);
          onValueChange?.(e.target.value);
          setInvalid(false);
        }}
        onInvalid={(e) => {
          e.preventDefault();
          setInvalid(true);
          trigger.current?.focus();
        }}
      >
        {children}
      </select>
      {invalid && (
        <span id={`${id}-error`} className="app-select-error" role="alert">
          Vui lòng chọn {label.toLocaleLowerCase('vi')}.
        </span>
      )}
      {open &&
        createPortal(
          <div
            ref={menu}
            className={`app-select-menu opens-${position.side}`}
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
              maxHeight: position.height,
              transform: position.side === 'top' ? 'translateY(-100%)' : undefined,
            }}
            onKeyDown={handleKeys}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {searchEnabled && (
              <div className="app-select-search">
                <Search size={15} aria-hidden="true" />
                <input
                  ref={search}
                  aria-label={`Tìm trong ${label.toLocaleLowerCase('vi')}`}
                  aria-controls={`${id}-list`}
                  aria-activedescendant={activeId}
                  placeholder="Tìm nhanh…"
                  value={query}
                  onChange={(e) => {
                    const next = e.target.value;
                    setQuery(next);
                    setActive(
                      options.find(
                        (o) => !o.disabled && normalize(o.label).includes(normalize(next)),
                      )?.value ?? '',
                    );
                  }}
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Xóa từ tìm kiếm"
                    onClick={() => {
                      setQuery('');
                      setActive(options.find((o) => !o.disabled)?.value ?? '');
                      search.current?.focus();
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}
            <div className="app-select-options" id={`${id}-list`} role="listbox" aria-label={label}>
              {filtered.map((option, i) => (
                <div
                  key={option.value}
                  id={`${id}-option-${i}`}
                  role="option"
                  aria-selected={option.value === current}
                  data-active={option.value === active}
                  className="app-select-option"
                  onPointerMove={() => setActive(option.value)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(option)}
                >
                  <span>{option.label}</span>
                  {option.value === current && <Check size={15} aria-hidden="true" />}
                </div>
              ))}
              {!filtered.length && <div className="app-select-empty">Không tìm thấy kết quả</div>}
            </div>
            {searchEnabled && (
              <div className="app-select-hint">
                ↑ ↓ Di chuyển <span>↵ Chọn</span>
              </div>
            )}
          </div>,
          document.body,
        )}
    </span>
  );
}

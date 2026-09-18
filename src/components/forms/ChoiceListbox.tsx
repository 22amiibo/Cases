"use client";

import { useId, useRef, useState } from "react";
import styles from "./ChoiceListbox.module.css";

type Choice = { id: string; label: string };

export function ChoiceListbox({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: Choice[];
  onChange: (id: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.id === value);

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.id);
    setActiveIndex(index);
    setOpen(false);
    trigger.current?.focus();
  }

  function move(offset: number) {
    setOpen(true);
    setActiveIndex((current) => {
      if (options.length === 0) return 0;
      return (current + offset + options.length) % options.length;
    });
  }

  return (
    <div className={styles.field}>
      <span id={`${id}-label`}>{label}</span>
      <div className={styles.control}>
        <button
          ref={trigger}
          type="button"
          role="combobox"
          aria-labelledby={`${id}-label`}
          aria-controls={`${id}-listbox`}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
          className={styles.trigger}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              move(1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              move(-1);
            } else if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (open) choose(activeIndex);
              else setOpen(true);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        >
          <span className={selected ? "" : styles.placeholder}>
            {selected?.label ?? placeholder}
          </span>
          <span aria-hidden="true">⌄</span>
        </button>
        {open && (
          <ul
            id={`${id}-listbox`}
            role="listbox"
            aria-labelledby={`${id}-label`}
            className={styles.listbox}
          >
            {options.map((option, index) => (
              <li
                id={`${id}-option-${index}`}
                key={option.id}
                role="option"
                aria-selected={value === option.id}
                className={index === activeIndex ? styles.active : ""}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {value === option.id && <span aria-hidden="true">✓</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Icon } from "./icon";

type SelectOption = { value: string; label: string; icon?: ReactNode };
type SelectProps = {
  name: string;
  label: string;
  defaultValue: string;
  options: readonly [SelectOption, ...SelectOption[]];
  disabled?: boolean;
};

export function Select({
  name,
  label,
  defaultValue,
  options,
  disabled = false,
}: SelectProps) {
  const id = useId();
  const controlId = `${id}-control`;
  const labelId = `${id}-label`;
  const menuId = `${id}-menu`;
  const root = useRef<HTMLDivElement>(null);
  const control = useRef<HTMLButtonElement>(null);
  const optionNodes = useRef<Array<HTMLLIElement | null>>([]);
  const search = useRef({ text: "", time: 0 });
  const [value, setValue] = useState(
    options.find((option) => option.value === defaultValue)?.value ??
      options[0].value,
  );
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState({ above: false, height: 240 });
  const expanded = open && !disabled;

  function openMenu(index = selectedIndex) {
    const bounds = control.current?.getBoundingClientRect();
    if (bounds) {
      const below = window.innerHeight - bounds.bottom - 12;
      const above = bounds.top - 12;
      const showAbove =
        below < Math.min(240, options.length * 56 + 16) && above > below;
      setPlacement({
        above: showAbove,
        height: Math.max(56, showAbove ? above : below),
      });
    }
    search.current = { text: "", time: 0 };
    setActiveIndex(index);
    setOpen(true);
  }

  function commit(index = activeIndex) {
    setValue(options[index].value);
    setOpen(false);
  }

  useEffect(() => {
    if (!expanded) return;
    function onPointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !root.current?.contains(event.target)
      ) {
        setValue(options[activeIndex].value);
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [expanded, activeIndex, options]);

  useEffect(() => {
    if (expanded)
      optionNodes.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [expanded, activeIndex]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    switch (event.key) {
      case "Enter":
      case " ":
        event.preventDefault();
        if (expanded) commit();
        else openMenu();
        return;
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (expanded && event.altKey && event.key === "ArrowUp") commit();
        else if (!expanded)
          openMenu(event.key === "ArrowUp" ? 0 : selectedIndex);
        else
          setActiveIndex((index) =>
            Math.max(
              0,
              Math.min(
                options.length - 1,
                index + (event.key === "ArrowDown" ? 1 : -1),
              ),
            ),
          );
        return;
      case "Home":
      case "End":
      case "PageUp":
      case "PageDown": {
        event.preventDefault();
        const index =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? options.length - 1
              : Math.max(
                  0,
                  Math.min(
                    options.length - 1,
                    activeIndex + (event.key === "PageDown" ? 10 : -10),
                  ),
                );
        if (!expanded) openMenu(index);
        else setActiveIndex(index);
        return;
      }
      case "Escape":
        if (expanded) event.preventDefault();
        setOpen(false);
        return;
      case "Tab":
        if (expanded) commit();
        return;
    }
    if (
      event.key.length !== 1 ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    const key = event.key.toLocaleLowerCase();
    const text =
      Date.now() - search.current.time < 700 ? search.current.text + key : key;
    if (!expanded) openMenu();
    search.current = { text, time: Date.now() };
    const repeated = [...text].every((character) => character === key);
    const query = repeated ? key : text;
    const start = query.length === 1 ? activeIndex + 1 : activeIndex;
    for (let offset = 0; offset < options.length; offset++) {
      const index = (start + offset) % options.length;
      if (options[index].label.toLocaleLowerCase().startsWith(query)) {
        setActiveIndex(index);
        break;
      }
    }
  }

  return (
    <div className="arcade-field" ref={root}>
      <label id={labelId} htmlFor={controlId}>
        {label}
      </label>
      <div className="playful-select" data-open={expanded}>
        <input type="hidden" name={name} value={value} disabled={disabled} />
        <button
          ref={control}
          id={controlId}
          type="button"
          role="combobox"
          className="arcade-input playful-select-trigger"
          aria-labelledby={labelId}
          aria-expanded={expanded}
          aria-haspopup="listbox"
          aria-controls={menuId}
          aria-activedescendant={
            expanded ? `${id}-option-${activeIndex}` : undefined
          }
          disabled={disabled}
          onKeyDown={onKeyDown}
          onClick={() => (expanded ? setOpen(false) : openMenu())}
          onBlur={(event) => {
            if (expanded && !root.current?.contains(event.relatedTarget))
              commit();
          }}
        >
          <span className="playful-select-value">
            {options[selectedIndex].icon}
            {options[selectedIndex].label}
          </span>
          <Icon name="chevron" className="playful-select-chevron" />
        </button>
        <ul
          id={menuId}
          role="listbox"
          aria-labelledby={labelId}
          className="playful-select-menu"
          hidden={!expanded}
          data-above={placement.above}
          style={{ maxHeight: placement.height }}
        >
          {options.map((option, index) => (
            <li
              ref={(node) => {
                optionNodes.current[index] = node;
              }}
              id={`${id}-option-${index}`}
              key={option.value}
              role="option"
              aria-selected={index === activeIndex}
              className="playful-select-option"
              onPointerDown={(event) => event.preventDefault()}
              onPointerMove={(event) => {
                if (event.pointerType === "mouse") setActiveIndex(index);
              }}
              onClick={() => {
                commit(index);
                control.current?.focus();
              }}
            >
              <span className="playful-select-value">
                {option.icon}
                {option.label}
              </span>
              {index === activeIndex && <Icon name="check" />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

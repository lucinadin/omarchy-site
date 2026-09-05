"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

type CommandItemRegistration = {
  disabled: boolean;
  element: HTMLButtonElement;
};

type HighlightDirection = "end" | "first" | "last" | "next" | "previous" | "start";

type CommandContextValue = {
  highlightedId: string | null;
  inputValue: string;
  listId: string;
  moveHighlight: (direction: HighlightDirection) => void;
  onInputValueChange: (value: string) => void;
  registerItem: (id: string, registration: CommandItemRegistration) => () => void;
  selectHighlighted: () => void;
  setHighlightedId: (id: string) => void;
};

const CommandContext = createContext<CommandContextValue | null>(null);

function useCommandContext() {
  const context = useContext(CommandContext);
  if (!context) throw new Error("Command parts must be rendered inside CommandRoot.");
  return context;
}

function orderedItems(items: Map<string, CommandItemRegistration>) {
  return Array.from(items.entries())
    .filter(([, item]) => !item.disabled)
    .toSorted(([, first], [, second]) => {
      const position = first.element.compareDocumentPosition(second.element);
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
}

export function CommandRoot({
  children,
  inputValue,
  onInputValueChange,
}: {
  children: ReactNode;
  inputValue: string;
  onInputValueChange: (value: string) => void;
}) {
  const listId = useId();
  const itemsRef = useRef(new Map<string, CommandItemRegistration>());
  const highlightedIdRef = useRef<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  function highlight(id: string | null) {
    highlightedIdRef.current = id;
    setHighlightedId(id);
  }

  function setFirstHighlight() {
    const first = orderedItems(itemsRef.current)[0];
    highlight(first?.[0] ?? null);
  }

  function moveHighlight(direction: HighlightDirection) {
    const items = orderedItems(itemsRef.current);
    if (items.length === 0) return;

    const currentIndex = items.findIndex(([id]) => id === highlightedIdRef.current);
    let nextIndex: number;

    if (direction === "first" || direction === "start") nextIndex = 0;
    else if (direction === "last" || direction === "end") nextIndex = items.length - 1;
    else if (direction === "previous") {
      nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
    } else {
      nextIndex = currentIndex === -1 || currentIndex === items.length - 1 ? 0 : currentIndex + 1;
    }

    const nextItem = items[nextIndex];
    if (!nextItem) return;
    highlight(nextItem[0]);
    nextItem[1].element.scrollIntoView({ block: "nearest" });
  }

  function registerItem(id: string, registration: CommandItemRegistration) {
    itemsRef.current.set(id, registration);
    if (highlightedIdRef.current === null && !registration.disabled) highlight(id);

    return () => {
      itemsRef.current.delete(id);
      if (highlightedIdRef.current === id) setFirstHighlight();
    };
  }

  function selectHighlighted() {
    const activeId = highlightedIdRef.current;
    if (!activeId) return;
    itemsRef.current.get(activeId)?.element.click();
  }

  return (
    <CommandContext
      value={{
        highlightedId,
        inputValue,
        listId,
        moveHighlight,
        onInputValueChange,
        registerItem,
        selectHighlighted,
        setHighlightedId: highlight,
      }}
    >
      {children}
    </CommandContext>
  );
}

export function CommandInputPrimitive(props: InputHTMLAttributes<HTMLInputElement>) {
  const {
    highlightedId,
    inputValue,
    listId,
    moveHighlight,
    onInputValueChange,
    selectHighlighted,
  } = useCommandContext();
  const { onChange, onKeyDown, ...inputProps } = props;

  return (
    <input
      aria-activedescendant={highlightedId ?? undefined}
      aria-autocomplete="list"
      aria-controls={listId}
      aria-expanded="true"
      autoComplete="off"
      onChange={(event) => {
        onChange?.(event);
        if (!event.defaultPrevented) onInputValueChange(event.currentTarget.value);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;

        if (event.key === "ArrowDown") moveHighlight("next");
        else if (event.key === "ArrowUp") moveHighlight("previous");
        else if (event.key === "Home") moveHighlight("first");
        else if (event.key === "End") moveHighlight("last");
        else if (event.key === "Enter") selectHighlighted();
        else return;

        event.preventDefault();
      }}
      role="combobox"
      value={inputValue}
      {...inputProps}
    />
  );
}

export function CommandListPrimitive({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { listId } = useCommandContext();
  return (
    <div id={listId} role="listbox" {...props}>
      {children}
    </div>
  );
}

export type CommandItemPrimitiveProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "value"
> & {
  onSelect?: () => void;
  value: string;
};

export function CommandItemPrimitive({
  disabled = false,
  onClick,
  onPointerMove,
  onSelect,
  value,
  ...props
}: CommandItemPrimitiveProps) {
  const id = useId();
  const itemRef = useRef<HTMLButtonElement>(null);
  const { highlightedId, registerItem, setHighlightedId } = useCommandContext();
  const highlighted = highlightedId === id;

  useEffect(() => {
    const element = itemRef.current;
    if (!element) return;
    return registerItem(id, { disabled, element });
  }, [disabled, id, registerItem]);

  return (
    <button
      aria-selected={highlighted}
      data-disabled={disabled ? "" : undefined}
      data-highlighted={highlighted ? "" : undefined}
      data-value={value}
      disabled={disabled}
      id={id}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onSelect?.();
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (!event.defaultPrevented && event.pointerType !== "touch") setHighlightedId(id);
      }}
      ref={itemRef}
      role="option"
      type="button"
      {...props}
    />
  );
}

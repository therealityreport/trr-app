"use client";

import * as React from "react";

type EditableSubmitHandler = (value: string) => void | Promise<void>;
type EditableRenderProps = {
  children: React.ReactElement;
  onClick?: React.MouseEventHandler;
  type?: "button";
};

type EditableContextValue = {
  draftValue: string;
  editing: boolean;
  inputId: string;
  labelId: string;
  placeholder: string;
  setDraftValue: (value: string) => void;
  startEditing: () => void;
  cancelEditing: () => void;
  submitEditing: () => Promise<void>;
  committedValue: string;
};

const EditableContext = React.createContext<EditableContextValue | null>(null);

function useEditableContext(componentName: string): EditableContextValue {
  const context = React.useContext(EditableContext);
  if (!context) {
    throw new Error(`${componentName} must be used within Editable`);
  }
  return context;
}

function joinClassNames(...values: Array<string | undefined | false | null>): string {
  return values.filter(Boolean).join(" ");
}

function renderAsChild({ children, onClick, type }: EditableRenderProps): React.ReactElement {
  return React.cloneElement(children, {
    onClick,
    type,
    ...children.props,
  });
}

export type EditableProps = {
  children: React.ReactNode;
  defaultValue?: string;
  onSubmit?: EditableSubmitHandler;
  placeholder?: string;
  value?: string;
};

export function Editable({ children, defaultValue = "", onSubmit, placeholder = "", value }: EditableProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const committedValue = value ?? internalValue;
  const [draftValue, setDraftValue] = React.useState(committedValue);
  const [editing, setEditing] = React.useState(false);
  const inputId = React.useId();
  const labelId = React.useId();

  React.useEffect(() => {
    setDraftValue(committedValue);
  }, [committedValue]);

  const contextValue = React.useMemo<EditableContextValue>(
    () => ({
      committedValue,
      draftValue,
      editing,
      inputId,
      labelId,
      placeholder,
      setDraftValue,
      startEditing: () => {
        setDraftValue(committedValue);
        setEditing(true);
      },
      cancelEditing: () => {
        setDraftValue(committedValue);
        setEditing(false);
      },
      submitEditing: async () => {
        const nextValue = draftValue.trim();
        await onSubmit?.(nextValue);
        if (value === undefined) {
          setInternalValue(nextValue);
        }
        setEditing(false);
      },
    }),
    [committedValue, draftValue, editing, inputId, labelId, onSubmit, placeholder, value],
  );

  return <EditableContext.Provider value={contextValue}>{children}</EditableContext.Provider>;
}

export function EditableLabel({ children, className }: React.HTMLAttributes<HTMLLabelElement>) {
  const { inputId, labelId } = useEditableContext("EditableLabel");
  return (
    <label id={labelId} htmlFor={inputId} className={joinClassNames("text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500", className)}>
      {children}
    </label>
  );
}

export function EditableArea({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={joinClassNames("space-y-2", className)}>{children}</div>;
}

export function EditablePreview({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const { committedValue, editing, placeholder } = useEditableContext("EditablePreview");
  if (editing) return null;
  return (
    <div className={joinClassNames("min-h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900", className)}>
      {committedValue || <span className="text-zinc-400">{placeholder}</span>}
    </div>
  );
}

export function EditableInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  const { draftValue, editing, inputId, labelId, placeholder, setDraftValue } = useEditableContext("EditableInput");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  if (!editing) return null;

  return (
    <input
      ref={inputRef}
      id={inputId}
      aria-labelledby={labelId}
      value={draftValue}
      placeholder={placeholder}
      onChange={(event) => setDraftValue(event.target.value)}
      className={joinClassNames(
        "min-h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-500",
        className,
      )}
      {...rest}
    />
  );
}

export function EditableTrigger({
  asChild = false,
  children,
}: {
  asChild?: boolean;
  children: React.ReactNode;
}) {
  const { editing, startEditing } = useEditableContext("EditableTrigger");
  if (editing) return null;
  if (!React.isValidElement(children)) return null;
  if (asChild) {
    return renderAsChild({ children, onClick: () => startEditing(), type: "button" });
  }
  return (
    <button type="button" onClick={() => startEditing()}>
      {children}
    </button>
  );
}

export function EditableToolbar({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  const { editing } = useEditableContext("EditableToolbar");
  if (!editing) return null;
  return <div className={joinClassNames("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

export function EditableSubmit({
  asChild = false,
  children,
}: {
  asChild?: boolean;
  children: React.ReactNode;
}) {
  const { submitEditing } = useEditableContext("EditableSubmit");
  if (!React.isValidElement(children)) return null;
  if (asChild) {
    return renderAsChild({ children, onClick: () => void submitEditing(), type: "button" });
  }
  return (
    <button type="button" onClick={() => void submitEditing()}>
      {children}
    </button>
  );
}

export function EditableCancel({
  asChild = false,
  children,
}: {
  asChild?: boolean;
  children: React.ReactNode;
}) {
  const { cancelEditing } = useEditableContext("EditableCancel");
  if (!React.isValidElement(children)) return null;
  if (asChild) {
    return renderAsChild({ children, onClick: () => cancelEditing(), type: "button" });
  }
  return (
    <button type="button" onClick={() => cancelEditing()}>
      {children}
    </button>
  );
}

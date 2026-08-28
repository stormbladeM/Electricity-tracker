"use client";

import { useState } from "react";
import { AdminEmpty, AdminTable, AdminTableSkeleton, Td, Th, Tr } from "../ui/admin-table";
import { AdminButton, Field, SelectField } from "../ui/field";
import { AreaList } from "./area-list";
import { useLocationActions } from "./use-location-actions";
import {
  useDiscos,
  useLgas,
  useStates,
  type DiscoRow,
  type LgaRow,
  type StateRow,
} from "./use-locations";

/**
 * States → LGAs → areas, one state at a time.
 *
 * A state picker rather than a list of all 37 with 774 LGAs under them: the
 * geographic tables are reference data that is already complete and correct,
 * so this screen is for the occasional correction — a misspelling, a missing
 * slug, a DisCo boundary — not for browsing. Loading one state's LGAs keeps
 * that fast and keeps the edit you are making in front of you.
 */
export function PlacesPanel() {
  const { rows: states, isLoading: statesLoading, refetch: refetchStates } = useStates();
  const { rows: discos } = useDiscos();
  const [stateId, setStateId] = useState("");

  if (statesLoading || !states) return <AdminTableSkeleton rows={6} />;
  if (states.length === 0) return <AdminEmpty message="No states have been seeded yet." />;

  // Land on a state rather than an empty screen. Derived rather than seeded
  // into state by an effect, so there is no render where the picker is blank.
  const state = states.find((row) => row.id === stateId) ?? states[0];

  return (
    <div className="flex flex-col gap-4">
      <SelectField
        label="State"
        value={state.id}
        onChange={setStateId}
        className="sm:w-72"
      >
        {states.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </SelectField>

      {/* Keyed by state so switching rebuilds both with that state's values
          instead of carrying the previous one's edits across. */}
      <StateForm key={state.id} state={state} onSaved={refetchStates} />
      <LgaTable key={`lgas-${state.id}`} stateId={state.id} discos={discos ?? []} />
    </div>
  );
}

function StateForm({ state, onSaved }: { state: StateRow; onSaved: () => void }) {
  const { saveState, isSaving, error } = useLocationActions();
  const [name, setName] = useState(state.name);
  const [code, setCode] = useState(state.code);
  const [slug, setSlug] = useState(state.slug ?? "");

  const changed =
    name !== state.name || code !== state.code || slug !== (state.slug ?? "");

  async function save() {
    const saved = await saveState(state.id, name, code, slug);
    if (saved) onSaved();
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-hairline bg-surface p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label="State name" value={name} onChange={setName} className="flex-1" />
        <Field label="Code" value={code} onChange={setCode} className="sm:w-24" />
        <Field label="Slug" value={slug} onChange={setSlug} className="sm:w-48" />
        <AdminButton onClick={save} disabled={!changed || isSaving}>
          Save
        </AdminButton>
      </div>
      <p className="text-12 text-text-muted">
        The slug is the public URL: /state/{slug || "…"}. Changing it breaks any link
        already shared.
      </p>
      {error && <p className="text-14 text-fault">{error}</p>}
    </div>
  );
}

function LgaTable({ stateId, discos }: { stateId: string; discos: DiscoRow[] }) {
  const { rows: lgas, isLoading, error, refetch } = useLgas(stateId);
  const [openId, setOpenId] = useState<string | null>(null);

  if (error) return <p className="text-14 text-fault">{error}</p>;
  if (isLoading || !lgas) return <AdminTableSkeleton rows={8} />;
  if (lgas.length === 0) return <AdminEmpty message="This state has no LGAs." />;

  return (
    <AdminTable
      caption="LGAs in the selected state"
      head={
        <>
          <Th>LGA</Th>
          <Th>Slug</Th>
          <Th className="text-right">Edit</Th>
        </>
      }
    >
      {lgas.map((lga) => (
        <LgaRows
          key={lga.id}
          lga={lga}
          discos={discos}
          isOpen={openId === lga.id}
          onToggle={() => setOpenId((current) => (current === lga.id ? null : lga.id))}
          onSaved={refetch}
        />
      ))}
    </AdminTable>
  );
}

function LgaRows({
  lga,
  discos,
  isOpen,
  onToggle,
  onSaved,
}: {
  lga: LgaRow;
  discos: DiscoRow[];
  isOpen: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  const { saveLga, isSaving, error } = useLocationActions();
  const [name, setName] = useState(lga.name);
  const [slug, setSlug] = useState(lga.slug ?? "");

  const changed = name !== lga.name || slug !== (lga.slug ?? "");

  async function save() {
    const saved = await saveLga(lga.id, name, slug);
    if (saved) onSaved();
  }

  return (
    <>
      <Tr isSelected={isOpen}>
        <Td className="whitespace-nowrap">{lga.name}</Td>
        <Td className="font-mono text-12 text-text-muted">{lga.slug ?? "—"}</Td>
        <Td className="text-right">
          <AdminButton onClick={onToggle}>{isOpen ? "Close" : "Edit"}</AdminButton>
        </Td>
      </Tr>

      {isOpen && (
        <tr>
          <td colSpan={3} className="border-b border-hairline bg-surface px-3 py-3">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Field label="LGA name" value={name} onChange={setName} className="flex-1" />
                <Field label="Slug" value={slug} onChange={setSlug} className="sm:w-48" />
                <AdminButton onClick={save} disabled={!changed || isSaving}>
                  Save
                </AdminButton>
              </div>
              {error && <p className="text-14 text-fault">{error}</p>}

              <AreaList lgaId={lga.id} discos={discos} onChanged={onSaved} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

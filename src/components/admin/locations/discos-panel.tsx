"use client";

import { useState } from "react";
import { AdminEmpty, AdminTable, AdminTableSkeleton, Td, Th, Tr } from "../ui/admin-table";
import { AdminButton, Field } from "../ui/field";
import { useLocationActions } from "./use-location-actions";
import { useDiscos, type DiscoRow } from "./use-locations";

/**
 * The distribution companies, and their short names.
 *
 * The short name is what the whole product shows — fault cards, the triage
 * table, the resolution metrics — because "IKEDC" fits in a column and "Ikeja
 * Electric Distribution Company" does not. The full name is what a person
 * would recognise. Both are editable here because the eleven successor DisCos
 * rename and rebrand, and every screen picks up the change at once.
 */
export function DiscosPanel() {
  const { rows: discos, isLoading, error, refetch } = useDiscos();
  const { saveDisco, isSaving, error: saveError } = useLocationActions();
  const [newName, setNewName] = useState("");
  const [newShort, setNewShort] = useState("");

  async function add() {
    const saved = await saveDisco(undefined, newName, newShort);
    if (!saved) return;
    setNewName("");
    setNewShort("");
    refetch();
  }

  if (error) return <p className="text-14 text-fault">{error}</p>;
  if (isLoading || !discos) return <AdminTableSkeleton rows={6} />;

  return (
    <div className="flex flex-col gap-4">
      {saveError && <p className="text-14 text-fault">{saveError}</p>}

      {discos.length === 0 ? (
        <AdminEmpty message="No DisCos yet." />
      ) : (
        <AdminTable
          caption="Distribution companies"
          head={
            <>
              <Th>Name</Th>
              <Th>Short name</Th>
              <Th className="text-right">Save</Th>
            </>
          }
        >
          {discos.map((disco) => (
            <DiscoRowForm key={disco.id} disco={disco} onSaved={refetch} />
          ))}
        </AdminTable>
      )}

      <div className="flex flex-col gap-2 rounded border border-hairline bg-surface p-3 sm:flex-row sm:items-end">
        <Field
          label="Add a DisCo"
          value={newName}
          onChange={setNewName}
          placeholder="Full name"
          className="flex-1"
        />
        <Field
          label="Short name"
          value={newShort}
          onChange={setNewShort}
          placeholder="e.g. IKEDC"
          className="sm:w-40"
        />
        <AdminButton onClick={add} disabled={!newName.trim() || isSaving}>
          Add
        </AdminButton>
      </div>
    </div>
  );
}

function DiscoRowForm({ disco, onSaved }: { disco: DiscoRow; onSaved: () => void }) {
  const { saveDisco, isSaving, error } = useLocationActions();
  const [name, setName] = useState(disco.name);
  const [shortName, setShortName] = useState(disco.short_name ?? "");

  const changed = name !== disco.name || shortName !== (disco.short_name ?? "");

  async function save() {
    const saved = await saveDisco(disco.id, name, shortName);
    if (saved) onSaved();
  }

  return (
    <Tr>
      <Td>
        <Field label="Name" hideLabel value={name} onChange={setName} />
        {error && <p className="mt-1 text-12 text-fault">{error}</p>}
      </Td>
      <Td className="w-40">
        <Field label="Short name" hideLabel value={shortName} onChange={setShortName} />
      </Td>
      <Td className="text-right">
        <AdminButton onClick={save} disabled={!changed || isSaving}>
          Save
        </AdminButton>
      </Td>
    </Tr>
  );
}

"use client";

import { useState } from "react";
import { AdminButton, Field, SelectField } from "../ui/field";
import { useAreas, type AreaRow, type DiscoRow } from "./use-locations";
import { useLocationActions } from "./use-location-actions";

/**
 * The areas under one LGA: the default area, any communities or estates added
 * under it, and the two operations that matter — assigning a DisCo, and
 * folding a duplicate into another.
 *
 * The DisCo control is the reason this screen exists. Seed 004 mapped every
 * Lagos LGA to Ikeja Electric as a documented simplification when EKEDC
 * actually serves half of them; this is where that gets corrected, one area at
 * a time, with an audit row for each.
 *
 * The default area (no name) is shown but only its DisCo can be changed. It is
 * where a contributor's log lands when they pick down to LGA level and no
 * further, so renaming or merging it away would take the LGA's write target
 * with it — the database refuses both, and the UI does not offer them.
 */
export function AreaList({
  lgaId,
  discos,
  onChanged,
}: {
  lgaId: string;
  discos: DiscoRow[];
  onChanged: () => void;
}) {
  const { rows: areas, isLoading, error, refetch } = useAreas(lgaId);
  const { saveArea, mergeAreas, isSaving, error: saveError } = useLocationActions();
  const [newName, setNewName] = useState("");

  async function addArea() {
    const saved = await saveArea({ lgaId, name: newName, slug: "", discoId: "" });
    if (!saved) return;
    setNewName("");
    refetch();
    onChanged();
  }

  async function save(area: AreaRow, name: string, slug: string, discoId: string) {
    const saved = await saveArea({ id: area.id, lgaId, name, slug, discoId });
    if (!saved) return;
    refetch();
    onChanged();
  }

  async function merge(sourceId: string, targetId: string) {
    const merged = await mergeAreas(sourceId, targetId);
    if (!merged) return;
    refetch();
    onChanged();
  }

  if (error) return <p className="text-14 text-fault">{error}</p>;
  if (isLoading || !areas) {
    return <p className="text-12 text-text-muted">Loading areas…</p>;
  }

  const mergeTargets = areas;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-12 uppercase tracking-wide text-text-muted">Areas</p>

      {saveError && <p className="text-14 text-fault">{saveError}</p>}

      <ul className="flex flex-col gap-3">
        {areas.map((area) => (
          <li key={area.id}>
            <AreaRowForm
              area={area}
              discos={discos}
              mergeTargets={mergeTargets}
              isSaving={isSaving}
              onSave={(name, slug, discoId) => save(area, name, slug, discoId)}
              onMerge={(targetId) => merge(area.id, targetId)}
            />
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 border-t border-hairline pt-3 sm:flex-row sm:items-end">
        <Field
          label="Add an area"
          value={newName}
          onChange={setNewName}
          placeholder="Community or estate name"
          className="flex-1"
        />
        <AdminButton onClick={addArea} disabled={!newName.trim() || isSaving}>
          Add
        </AdminButton>
      </div>
    </div>
  );
}

function AreaRowForm({
  area,
  discos,
  mergeTargets,
  isSaving,
  onSave,
  onMerge,
}: {
  area: AreaRow;
  discos: DiscoRow[];
  mergeTargets: AreaRow[];
  isSaving: boolean;
  onSave: (name: string, slug: string, discoId: string) => void;
  onMerge: (targetId: string) => void;
}) {
  const isDefault = area.name === null;
  const [name, setName] = useState(area.name ?? "");
  const [slug, setSlug] = useState(area.slug ?? "");
  const [discoId, setDiscoId] = useState(area.disco_id ?? "");
  const [mergeInto, setMergeInto] = useState("");

  const changed =
    (!isDefault && (name !== (area.name ?? "") || slug !== (area.slug ?? ""))) ||
    discoId !== (area.disco_id ?? "");

  return (
    <div className="flex flex-col gap-2 rounded border border-hairline p-3 sm:flex-row sm:items-end">
      {isDefault ? (
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-12 uppercase tracking-wide text-text-muted">Area</span>
          <p className="py-1.5 text-14 text-text">
            Default area
            <span className="ml-2 text-12 text-text-muted">
              where LGA-level logs land
            </span>
          </p>
        </div>
      ) : (
        <>
          <Field label="Name" value={name} onChange={setName} className="flex-1" />
          <Field label="Slug" value={slug} onChange={setSlug} className="sm:w-40" />
        </>
      )}

      <SelectField
        label="DisCo"
        value={discoId}
        onChange={setDiscoId}
        className="sm:w-48"
      >
        <option value="">Not set</option>
        {discos.map((disco) => (
          <option key={disco.id} value={disco.id}>
            {disco.short_name ?? disco.name}
          </option>
        ))}
      </SelectField>

      <AdminButton onClick={() => onSave(name, slug, discoId)} disabled={!changed || isSaving}>
        Save
      </AdminButton>

      {!isDefault && mergeTargets.length > 1 && (
        <div className="flex items-end gap-2">
          <SelectField
            label="Merge into"
            value={mergeInto}
            onChange={setMergeInto}
            className="sm:w-44"
          >
            <option value="">Keep separate</option>
            {mergeTargets
              .filter((target) => target.id !== area.id)
              .map((target) => (
                <option key={target.id} value={target.id}>
                  {target.name ?? "Default area"}
                </option>
              ))}
          </SelectField>
          <AdminButton onClick={() => onMerge(mergeInto)} disabled={!mergeInto || isSaving}>
            Merge
          </AdminButton>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { FrameworkBranch, FrameworkSubmission } from "@/core/schema";
import styles from "./FrameworkBuilder.module.css";

type Concept = {
  id: string;
  label: string;
  aliases: string[];
};

type FrameworkBuilderProps = {
  concepts: Concept[];
  onSubmit: (submission: FrameworkSubmission) => void;
  requireRationale?: boolean;
};

function collectIds(branches: FrameworkBranch[]): string[] {
  return branches.flatMap((branch) => [branch.conceptId, ...collectIds(branch.children)]);
}

function removeConcept(
  branches: FrameworkBranch[],
  conceptId: string,
): FrameworkBranch[] {
  return branches
    .filter((branch) => branch.conceptId !== conceptId)
    .map((branch) => ({
      ...branch,
      children: removeConcept(branch.children, conceptId),
    }));
}

function appendChild(
  branches: FrameworkBranch[],
  parentId: string,
  child: FrameworkBranch,
): FrameworkBranch[] {
  return branches.map((branch) =>
    branch.conceptId === parentId
      ? { ...branch, children: [...branch.children, child] }
      : { ...branch, children: appendChild(branch.children, parentId, child) },
  );
}

export function FrameworkBuilder({
  concepts,
  onSubmit,
  requireRationale = false,
}: FrameworkBuilderProps) {
  const [branches, setBranches] = useState<FrameworkBranch[]>([]);
  const [selectedConceptId, setSelectedConceptId] = useState("");
  const [priorityConceptId, setPriorityConceptId] = useState("");
  const [search, setSearch] = useState("");
  const [rationale, setRationale] = useState("");
  const [childSelections, setChildSelections] = useState<Record<string, string>>(
    {},
  );
  const conceptById = useMemo(
    () => new Map(concepts.map((concept) => [concept.id, concept])),
    [concepts],
  );
  const selectedIds = new Set(collectIds(branches));
  const filteredConcepts = concepts.filter((concept) => {
    const haystack = `${concept.label} ${concept.aliases.join(" ")}`.toLowerCase();
    return !selectedIds.has(concept.id) && haystack.includes(search.toLowerCase());
  });

  function addTopLevelBranch() {
    if (!selectedConceptId || branches.length >= 4) return;
    setBranches((current) => [
      ...current,
      { conceptId: selectedConceptId, children: [] },
    ]);
    setPriorityConceptId((current) => current || selectedConceptId);
    setSelectedConceptId("");
  }

  function removeBranch(conceptId: string) {
    setBranches((current) => removeConcept(current, conceptId));
    if (priorityConceptId === conceptId) setPriorityConceptId("");
  }

  function moveBranch(index: number, offset: -1 | 1) {
    setBranches((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addChild(parentId: string) {
    const conceptId = childSelections[parentId];
    if (!conceptId) return;
    setBranches((current) =>
      appendChild(current, parentId, { conceptId, children: [] }),
    );
    setChildSelections((current) => ({ ...current, [parentId]: "" }));
  }

  function renderBranch(branch: FrameworkBranch, depth: number, index: number) {
    const concept = conceptById.get(branch.conceptId);
    if (!concept) return null;
    const availableChildren = concepts.filter(
      (candidate) => !selectedIds.has(candidate.id),
    );

    return (
      <li className={styles.branch} key={branch.conceptId}>
        <div className={styles.branchHeader}>
          <div>
            <span className={styles.depth}>Level {depth + 1}</span>
            <h3>{concept.label}</h3>
          </div>
          <div className={styles.actions}>
            {depth === 0 && (
              <>
                <button
                  type="button"
                  onClick={() => moveBranch(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${concept.label} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveBranch(index, 1)}
                  disabled={index === branches.length - 1}
                  aria-label={`Move ${concept.label} down`}
                >
                  ↓
                </button>
              </>
            )}
            <button
              type="button"
              className={
                priorityConceptId === branch.conceptId ? styles.priority : ""
              }
              onClick={() => setPriorityConceptId(branch.conceptId)}
              aria-pressed={priorityConceptId === branch.conceptId}
              aria-label={`Start with ${concept.label}`}
            >
              Start here
            </button>
            <button
              type="button"
              onClick={() => removeBranch(branch.conceptId)}
              aria-label={`Remove ${concept.label}`}
            >
              Remove
            </button>
          </div>
        </div>

        {depth < 2 && availableChildren.length > 0 && (
          <div className={styles.childComposer}>
            <label>
              Add a child to {concept.label}
              <select
                value={childSelections[branch.conceptId] ?? ""}
                onChange={(event) =>
                  setChildSelections((current) => ({
                    ...current,
                    [branch.conceptId]: event.target.value,
                  }))
                }
              >
                <option value="">Choose a concept</option>
                {availableChildren.map((candidate) => (
                  <option value={candidate.id} key={candidate.id}>
                    {candidate.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => addChild(branch.conceptId)}>
              Add child
            </button>
          </div>
        )}

        {branch.children.length > 0 && (
          <ol className={styles.children}>
            {branch.children.map((child, childIndex) =>
              renderBranch(child, depth + 1, childIndex),
            )}
          </ol>
        )}
      </li>
    );
  }

  return (
    <form
      className={styles.builder}
      onSubmit={(event) => {
        event.preventDefault();
        if (
          !priorityConceptId ||
          branches.length === 0 ||
          (requireRationale && !rationale.trim())
        ) return;
        onSubmit({
          branches,
          priorityConceptId,
          ...(rationale.trim() ? { rationale: rationale.trim() } : {}),
        });
      }}
    >
      <div className={styles.composer}>
        <label>
          Search concepts
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Try revenue or unit cost"
          />
        </label>
        <label>
          Concept to add
          <select
            value={selectedConceptId}
            onChange={(event) => setSelectedConceptId(event.target.value)}
          >
            <option value="">Choose a concept</option>
            {filteredConcepts.map((concept) => (
              <option value={concept.id} key={concept.id}>
                {concept.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={addTopLevelBranch}
          disabled={!selectedConceptId || branches.length >= 4}
        >
          Add branch
        </button>
      </div>

      {branches.length === 0 ? (
        <p className={styles.empty}>Build up to four distinct top-level branches.</p>
      ) : (
        <ol className={styles.tree}>
          {branches.map((branch, index) => renderBranch(branch, 0, index))}
        </ol>
      )}

      {requireRationale && (
        <label>
          Why start with this branch?
          <textarea
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
            maxLength={2000}
          />
        </label>
      )}

      <button
        className={styles.submit}
        type="submit"
        disabled={
          branches.length === 0 ||
          !priorityConceptId ||
          (requireRationale && !rationale.trim())
        }
      >
        Submit framework
      </button>
    </form>
  );
}

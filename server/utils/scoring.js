/**
 * Deterministic Task Assignment Scoring
 * Score = (SkillMatch × 5) + (Availability × 3) + (Distance × 2) + (Experience × 1)
 */

function scoreVolunteerForTask(volunteer, task, eventVolunteers) {
  // Skill match: how many required skills does the volunteer have
  const matchedSkills = task.requiredSkills.filter((s) =>
    volunteer.skills.includes(s)
  ).length;
  const skillMatch = task.requiredSkills.length > 0
    ? matchedSkills / task.requiredSkills.length
    : 1;

  // Availability: penalize if already assigned to another task in this event
  const alreadyAssigned = eventVolunteers.some(
    (v) => v.userId === volunteer.id && v.taskId && v.taskId !== task.id
  );
  const availability = alreadyAssigned ? 0 : 1;

  // Distance score: not applicable in demo → default 1
  const distanceScore = 1;

  // Experience score (normalized 0–1, max 5)
  const expNorm = Math.min(volunteer.experienceScore, 5) / 5;

  // No-show penalty
  const noShowPenalty = volunteer.noShowCount > 2 ? -5 : 0;

  const score =
    skillMatch * 5 +
    availability * 3 +
    distanceScore * 2 +
    expNorm * 1 +
    noShowPenalty;

  return Math.max(0, score);
}

/**
 * Auto-assigns the best available volunteer to a task
 * Returns { volunteerId, taskId, score } or null
 */
function autoAssignVolunteer(volunteer, event) {
  // Find tasks that still need volunteers
  const openTasks = event.tasks.filter(
    (t) => t.assignedVolunteers.length < t.requiredCount
  );
  if (openTasks.length === 0) return null;

  // Sort by priority DESC, then score DESC
  const candidates = openTasks
    .map((task) => ({
      task,
      score: scoreVolunteerForTask(volunteer, task, event.volunteers),
    }))
    .sort((a, b) => {
      if (b.task.priority !== a.task.priority) return b.task.priority - a.task.priority;
      return b.score - a.score;
    });

  const best = candidates[0];
  return best ? { taskId: best.task.id, score: best.score } : null;
}

/**
 * Returns ranked task options for manual assignment display
 */
function rankTasksForVolunteer(volunteer, event) {
  return event.tasks.map((task) => ({
    taskId: task.id,
    taskName: task.name,
    score: scoreVolunteerForTask(volunteer, task, event.volunteers),
    isFull: task.assignedVolunteers.length >= task.requiredCount,
    priority: task.priority,
  })).sort((a, b) => b.score - a.score);
}

module.exports = { autoAssignVolunteer, rankTasksForVolunteer, scoreVolunteerForTask };

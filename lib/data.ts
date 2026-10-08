import "server-only"

import { getDb } from "./db"
import { getDataQualityReport as dataQualityReport } from "./services/data-quality"
import * as students from "./services/students"
import type { OutreachQueueFilters, StudentFilters } from "./types"

/*
 * What server components read. Each function opens the shared database and calls the service
 * layer, the same code the API routes use. Changes (logging a note, importing) go through the API.
 */

export async function getStudents(filters: StudentFilters = {}) {
  return students.listStudents(await getDb(), filters)
}

export async function getStudent(id: string) {
  return students.getStudent(await getDb(), id)
}

export async function getNotes(studentId: string) {
  return students.listNotes(await getDb(), studentId)
}

export async function getStudentDataNotes(studentId: string) {
  return students.getStudentDataNotes(await getDb(), studentId)
}

export async function getOutreachQueue(filters: OutreachQueueFilters = {}) {
  return students.getOutreachQueue(await getDb(), filters)
}

export async function getOutreachStats(advisor?: string | null) {
  return students.getOutreachStats(await getDb(), advisor)
}

export async function getAdvisors() {
  return students.getAdvisors(await getDb())
}

export async function getMajors() {
  return students.getMajors(await getDb())
}

export async function getStudentIndex() {
  return students.getStudentIndex(await getDb())
}

export async function getDataQualityReport() {
  return dataQualityReport(await getDb())
}

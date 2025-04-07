import { collection, doc, setDoc, getDoc, getDocs, deleteDoc } from "firebase/firestore"
import { db } from "./firebase"
import type { Preference, Assignment, Role } from "./types"

// Admin Emails
export const getAdminEmails = async () => {
  const querySnapshot = await getDocs(collection(db, "adminEmails"))
  return querySnapshot.docs.map((doc) => doc.data().email as string)
}

export const addAdminEmail = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase()
  await setDoc(doc(db, "adminEmails", normalizedEmail), {
    email: normalizedEmail,
    timestamp: new Date()
  })
}

export const removeAdminEmail = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase()
  await deleteDoc(doc(db, "adminEmails", normalizedEmail))
}

// Preferences
export const savePreferences = async (preference: Omit<Preference, "timestamp">) => {
  const preferenceWithTimestamp = {
    ...preference,
    timestamp: new Date(),
  }

  await setDoc(doc(db, "preferences", preference.userId), preferenceWithTimestamp)
  return preferenceWithTimestamp
}

export const getPreference = async (userId: string) => {
  const docRef = doc(db, "preferences", userId)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    return docSnap.data() as Preference
  }

  return null
}

export const deletePreferences = async (userId: string) => {
  const docRef = doc(db, "preferences", userId);
  await deleteDoc(docRef);
};

export const getAllPreferences = async () => {
  const querySnapshot = await getDocs(collection(db, "preferences"))
  return querySnapshot.docs.map((doc) => doc.data() as Preference)
}

// Assignments
export const saveAssignment = async (assignment: Omit<Assignment, "timestamp">) => {
  const assignmentWithTimestamp = {
    ...assignment,
    timestamp: new Date(),
  }

  await setDoc(doc(db, "assignments", assignment.userId), assignmentWithTimestamp)
  return assignmentWithTimestamp
}

export const getAllAssignments = async () => {
  const querySnapshot = await getDocs(collection(db, "assignments"))
  return querySnapshot.docs.map((doc) => doc.data() as Assignment)
}

export const clearAllAssignments = async () => {
  const querySnapshot = await getDocs(collection(db, "assignments"))
  const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref))
  await Promise.all(deletePromises)
}

// Allocation Status
export const saveAllocationStatus = async (status: { completed: boolean; timestamp?: Date }) => {
  await setDoc(doc(db, "status", "allocation"), {
    ...status,
    timestamp: status.timestamp || new Date(),
  })
}

export const getAllocationStatus = async () => {
  const docRef = doc(db, "status", "allocation")
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    return docSnap.data() as { completed: boolean; timestamp: Date }
  }

  return { completed: false, timestamp: new Date() }
}

// Roles
export const getAllRoles = async (): Promise<Role[]> => {
  const querySnapshot = await getDocs(collection(db, "roles"))
  return querySnapshot.docs.map((doc) => doc.data() as Role)
}

export const saveRole = async (role: Role) => {
  await setDoc(doc(db, "roles", role.id), role)
  return role
}

export const deleteRole = async (roleId: string) => {
  await deleteDoc(doc(db, "roles", roleId))
}

export const initializeRolesIfEmpty = async (defaultRoles: Role[]) => {
  const roles = await getAllRoles()

  if (roles.length === 0) {
    // If no roles exist in the database, initialize with default roles
    const savePromises = defaultRoles.map(role => saveRole(role))
    await Promise.all(savePromises)
    return defaultRoles
  }

  return roles
}

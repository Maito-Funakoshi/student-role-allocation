export interface Role {
  id: string
  title: string
  description: string
  capacity: number
}

export interface User {
  uid: string
  email: string
  displayName: string
  isAdmin: boolean
}

export interface Preference {
  userId: string
  userName: string
  preferences: string[] // Array of role IDs in order of preference
  timestamp: Date
}

export interface Assignment {
  userId: string
  userName: string
  roleId: string
  roleName: string
  preferenceRank: number // The rank this role had in the user's preferences (1-based)
  timestamp: Date
}

export interface AllocationResult {
  assignments: Assignment[]
  unassignedUsers: string[]
  unassignedRoles: string[]
  satisfactionScore: number // A measure of how well preferences were satisfied
}

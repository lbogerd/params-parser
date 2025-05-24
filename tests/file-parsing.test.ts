import { unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { parseFile } from '../src/parser'

describe('File Parsing', () => {
  const testDir = './tests/fixtures'
  const tsFile = join(testDir, 'test.ts')
  const tsxFile = join(testDir, 'Component.tsx')

  beforeAll(() => {
    // Create test directory if it doesn't exist
    try {
      import('node:fs').then((fs) => fs.mkdirSync(testDir, { recursive: true }))
    } catch {
      // Directory might already exist
    }
  })

  afterAll(() => {
    // Clean up test files
    try {
      unlinkSync(tsFile)
      unlinkSync(tsxFile)
    } catch {
      // Files might not exist
    }
  })

  describe('TypeScript File Parsing', () => {
    it('should parse a real TypeScript file', () => {
      const content = `
/**
 * User management utilities
 */

interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user' | 'guest'
}

/**
 * Creates a new user account
 * @param userData The user data to create
 * @param validateEmail Whether to validate email format
 */
function createUser(
  userData: Omit<User, 'id'>,
  validateEmail: boolean = true
): Promise<User> {
  // Implementation would go here
  return Promise.resolve({ id: 1, ...userData })
}

/**
 * Filters users by role
 */
const filterUsersByRole = (users: User[], role: User['role']): User[] => {
  return users.filter(user => user.role === role)
}

// Configuration constants
const API_BASE_URL = 'https://api.example.com'
const MAX_USERS_PER_PAGE = 50
const DEFAULT_USER_ROLE = 'user'

export { createUser, filterUsersByRole, API_BASE_URL }
      `

      writeFileSync(tsFile, content)

      const result = parseFile(tsFile, {
        includeJsDoc: true,
        includeDefaultValues: true,
      })

      // Should find functions
      expect(result.functions).toHaveLength(2)

      const createUserFunc = result.functions.find(
        (f) => f.name === 'createUser',
      )
      expect(createUserFunc).toBeDefined()
      expect(createUserFunc!.description).toContain(
        'Creates a new user account',
      )
      expect(createUserFunc!.parameters).toHaveLength(2)
      expect(createUserFunc!.parameters[1].defaultValue).toBe('true')

      const filterFunc = result.functions.find(
        (f) => f.name === 'filterUsersByRole',
      )
      expect(filterFunc).toBeDefined()
      expect(filterFunc!.parameters).toHaveLength(2)

      // Should find constants
      expect(result.constants).toHaveLength(3)
      const apiUrl = result.constants.find((c) => c.name === 'API_BASE_URL')
      expect(apiUrl).toBeDefined()
      expect(apiUrl!.value).toBe("'https://api.example.com'")
    })
  })

  describe('TSX File Parsing', () => {
    it('should parse a React component file', () => {
      const content = `
import React from 'react'

interface ButtonProps {
  /** The text to display on the button */
  label: string
  /** Click handler function */
  onClick: (event: MouseEvent) => void
  /** Button variant style */
  variant?: 'primary' | 'secondary' | 'danger'
  /** Whether the button is disabled */
  disabled?: boolean
  /** Optional icon to display */
  icon?: string
}

/**
 * A reusable button component
 * @param props The button properties
 */
function Button({ 
  label, 
  onClick, 
  variant = 'primary', 
  disabled = false,
  icon 
}: ButtonProps): JSX.Element {
  return (
    <button 
      className={\`btn btn-\${variant}\`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="icon">{icon}</span>}
      {label}
    </button>
  )
}

/**
 * A card component for displaying content
 */
const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ 
  title, 
  children 
}) => {
  return (
    <div className="card">
      <h3>{title}</h3>
      <div className="card-content">
        {children}
      </div>
    </div>
  )
}

export default Button
export { Card }
      `

      writeFileSync(tsxFile, content)

      const result = parseFile(tsxFile, {
        includeJsDoc: true,
        includeDefaultValues: true,
      })

      // Should find both components as functions
      expect(result.functions).toHaveLength(2)

      const buttonFunc = result.functions.find((f) => f.name === 'Button')
      expect(buttonFunc).toBeDefined()
      expect(buttonFunc!.description).toContain('A reusable button component')
      expect(buttonFunc!.parameters).toHaveLength(1)

      // The props parameter should be an object type
      const propsParam = buttonFunc!.parameters[0]
      expect(propsParam.type).toHaveProperty('type', 'object')

      const cardFunc = result.functions.find((f) => f.name === 'Card')
      expect(cardFunc).toBeDefined()
      expect(cardFunc!.parameters).toHaveLength(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle non-existent files gracefully', () => {
      expect(() => {
        parseFile('./non-existent-file.ts')
      }).toThrow()
    })

    it('should handle malformed TypeScript', () => {
      const malformedFile = join(testDir, 'malformed.ts')
      const malformedContent = `
        function incomplete(param: string {
          // Missing closing parenthesis and return type
      `

      writeFileSync(malformedFile, malformedContent)

      // Should not throw, but might return limited results
      const result = parseFile(malformedFile)
      expect(result).toBeDefined()
      expect(result.functions).toBeDefined()
      expect(result.constants).toBeDefined()

      try {
        unlinkSync(malformedFile)
      } catch {
        // Ignore cleanup errors
      }
    })
  })
})

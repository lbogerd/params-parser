import { describe, expect, it } from 'vitest'
import { ParamsParser, parseContent, parseFile } from '../src/index'

describe('params-parser integration', () => {
  it('should export all required functionality', () => {
    // Test that all exports are available
    expect(ParamsParser).toBeDefined()
    expect(typeof ParamsParser).toBe('function')
    expect(parseContent).toBeDefined()
    expect(typeof parseContent).toBe('function')
    expect(parseFile).toBeDefined()
    expect(typeof parseFile).toBe('function')
  })

  it('should work as described in README', () => {
    const content = `
      /**
       * Greets a user with a custom message
       * @param name The user's name
       * @param greeting The greeting message
       */
      function greetUser(
        name: string, 
        greeting: string = "Hello",
        options?: { formal: boolean; includeTime: boolean }
      ): string {
        return \`\${greeting} \${name}\`
      }

      /**
       * Configuration for the app
       */
      const APP_CONFIG = {
        version: "1.0.0",
        debug: true
      }

      const processItems = (items: Array<{ id: number; name: string }>): void => {
        // Process items
      }
    `

    const result = parseContent(content, 'example.ts', {
      includeJsDoc: true,
      includeDefaultValues: true,
    })

    // Should parse functions correctly
    expect(result.functions).toHaveLength(2)

    const greetFunc = result.functions.find((f) => f.name === 'greetUser')
    expect(greetFunc).toBeDefined()
    expect(greetFunc!.description).toContain('Greets a user')
    expect(greetFunc!.parameters).toHaveLength(3)

    // Check parameter types
    expect(greetFunc!.parameters[0].type).toEqual({ type: 'string' })
    expect(greetFunc!.parameters[1].defaultValue).toBe('"Hello"')
    expect(greetFunc!.parameters[2].required).toBe(false)

    // Should parse constants
    expect(result.constants).toHaveLength(1)
    const config = result.constants[0]
    expect(config.name).toBe('APP_CONFIG')
    expect(config.value).toContain('version')

    // Should parse arrow function
    const processFunc = result.functions.find((f) => f.name === 'processItems')
    expect(processFunc).toBeDefined()
    expect(processFunc!.parameters[0].type).toHaveProperty('type', 'array')
  })

  it('should handle React/TSX components', () => {
    const tsxContent = `
      interface Props {
        title: string
        count?: number
        onAction: (id: string) => void
        variant: 'primary' | 'secondary'
      }

      function MyComponent({ title, count = 0, onAction, variant }: Props) {
        return <div>{title}: {count}</div>
      }
    `

    const result = parseContent(tsxContent, 'Component.tsx')

    expect(result.functions).toHaveLength(1)
    const component = result.functions[0]
    expect(component.name).toBe('MyComponent')
    expect(component.parameters).toHaveLength(1)

    // Props should be parsed as object type
    const propsParam = component.parameters[0]
    expect(propsParam.type).toHaveProperty('type', 'object')
  })

  it('should demonstrate full type inference capability', () => {
    const content = `
      // Basic types
      function basicTypes(str: string, num: number, bool: boolean, date: Date): void {}
      
      // Enum-like union
      function withEnum(status: 'active' | 'inactive' | 'pending'): void {}
      
      // Object type
      function withObject(user: { id: number; name: string; email?: string }): void {}
      
      // Array type
      function withArray(items: string[]): void {}
      
      // Complex nested type
      function complex(
        data: {
          users: Array<{ 
            profile: { 
              name: string; 
              preferences: ('email' | 'sms')[] 
            } 
          }>
        }
      ): void {}
    `

    const result = parseContent(content)

    expect(result.functions).toHaveLength(5)

    // Test basic types
    const basicFunc = result.functions[0]
    expect(basicFunc.parameters[0].type).toEqual({ type: 'string' })
    expect(basicFunc.parameters[1].type).toEqual({ type: 'number' })
    expect(basicFunc.parameters[2].type).toEqual({ type: 'boolean' })
    expect(basicFunc.parameters[3].type).toEqual({ type: 'date' })

    // Test enum
    const enumFunc = result.functions[1]
    expect(enumFunc.parameters[0].type).toHaveProperty('type', 'enum')

    // Test object
    const objectFunc = result.functions[2]
    expect(objectFunc.parameters[0].type).toHaveProperty('type', 'object')

    // Test array
    const arrayFunc = result.functions[3]
    expect(arrayFunc.parameters[0].type).toHaveProperty('type', 'array')

    // Test complex nested
    const complexFunc = result.functions[4]
    expect(complexFunc.parameters[0].type).toHaveProperty('type', 'object')
  })
})

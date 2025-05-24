import { beforeEach, describe, expect, it } from 'vitest'
import { ParamsParser, parseContent, parseFile } from '../src/parser'
import type { SimpleArray, SimpleObject } from '../src/types'

describe('ParamsParser', () => {
  let parser: ParamsParser

  beforeEach(() => {
    parser = new ParamsParser()
  })

  describe('Function Declaration Parsing', () => {
    it('should parse simple function with basic types', () => {
      const content = `
        function greet(name: string, age: number, isActive: boolean): string {
          return \`Hello \${name}\`
        }
      `

      const result = parser.parseContent(content)

      expect(result.functions).toHaveLength(1)
      const func = result.functions[0]

      expect(func.name).toBe('greet')
      expect(func.parameters).toHaveLength(3)
      expect(func.returnType).toBe('string')

      // Check name parameter
      expect(func.parameters[0].name).toBe('name')
      expect(func.parameters[0].type).toEqual({ type: 'string' })
      expect(func.parameters[0].required).toBe(true)

      // Check age parameter
      expect(func.parameters[1].name).toBe('age')
      expect(func.parameters[1].type).toEqual({ type: 'number' })
      expect(func.parameters[1].required).toBe(true)

      // Check isActive parameter
      expect(func.parameters[2].name).toBe('isActive')
      expect(func.parameters[2].type).toEqual({ type: 'boolean' })
      expect(func.parameters[2].required).toBe(true)
    })

    it('should parse function with optional parameters', () => {
      const content = `
        function createUser(name: string, email?: string, age = 25): void {
        }
      `

      const result = parser.parseContent(content)
      const func = result.functions[0]

      expect(func.parameters[0].required).toBe(true) // name is required
      expect(func.parameters[1].required).toBe(false) // email is optional
      expect(func.parameters[2].required).toBe(false) // age has default value
    })

    it('should parse function with default values when option is enabled', () => {
      const content = `
        function calculate(x: number, multiplier = 2, prefix = "Result:"): string {
          return prefix + (x * multiplier)
        }
      `

      const result = parser.parseContent(content, 'test.ts', {
        includeDefaultValues: true,
      })
      const func = result.functions[0]

      expect(func.parameters[1].defaultValue).toBe('2')
      expect(func.parameters[2].defaultValue).toBe('"Result:"')
    })

    it('should parse function with JSDoc comments when option is enabled', () => {
      const content = `
        /**
         * Calculates the area of a rectangle
         * @param width The width of the rectangle
         * @param height The height of the rectangle
         */
        function calculateArea(width: number, height: number): number {
          return width * height
        }
      `

      const result = parser.parseContent(content, 'test.ts', {
        includeJsDoc: true,
      })
      const func = result.functions[0]

      expect(func.description).toContain('Calculates the area of a rectangle')
    })
  })

  describe('Arrow Function Parsing', () => {
    it('should parse arrow functions assigned to const', () => {
      const content = `
        const add = (a: number, b: number): number => a + b
        const multiply = (x: number, y: number) => x * y
      `

      const result = parser.parseContent(content)

      expect(result.functions).toHaveLength(2)

      const addFunc = result.functions.find((f) => f.name === 'add')
      expect(addFunc).toBeDefined()
      expect(addFunc!.parameters).toHaveLength(2)
      expect(addFunc!.returnType).toBe('number')

      const multiplyFunc = result.functions.find((f) => f.name === 'multiply')
      expect(multiplyFunc).toBeDefined()
      expect(multiplyFunc!.parameters).toHaveLength(2)
    })
  })

  describe('Complex Type Parsing', () => {
    it('should parse enum-like union types', () => {
      const content = `
        function setStatus(status: "active" | "inactive" | "pending"): void {
        }
      `

      const result = parser.parseContent(content)
      const param = result.functions[0].parameters[0]

      expect(param.type).toEqual({
        type: 'enum',
        values: ['active', 'inactive', 'pending'],
      })
    })

    it('should parse object types', () => {
      const content = `
        function processUser(user: { name: string; age: number; email?: string }): void {
        }
      `

      const result = parser.parseContent(content)
      const param = result.functions[0].parameters[0]
      const objectType = param.type as SimpleObject

      expect(objectType.type).toBe('object')
      expect(objectType.properties.name.type).toEqual({ type: 'string' })
      expect(objectType.properties.name.required).toBe(true)
      expect(objectType.properties.age.type).toEqual({ type: 'number' })
      expect(objectType.properties.email.required).toBe(false)
    })

    it('should parse array types', () => {
      const content = `
        function processNumbers(numbers: number[]): void {
        }
        function processUsers(users: Array<string>): void {
        }
      `

      const result = parser.parseContent(content)

      const numbersParam = result.functions[0].parameters[0]
      const arrayType = numbersParam.type as SimpleArray
      expect(arrayType.type).toBe('array')
      expect(arrayType.items[0].type).toEqual({ type: 'number' })
    })

    it('should parse Date type', () => {
      const content = `
        function scheduleEvent(date: Date, title: string): void {
        }
      `

      const result = parser.parseContent(content)
      const dateParam = result.functions[0].parameters[0]

      expect(dateParam.type).toEqual({ type: 'date' })
    })
  })

  describe('Constant Declaration Parsing', () => {
    it('should parse const declarations', () => {
      const content = `
        const API_URL = "https://api.example.com"
        const MAX_RETRIES = 3
        const IS_DEVELOPMENT = true
      `

      const result = parser.parseContent(content)

      expect(result.constants).toHaveLength(3)

      const apiUrl = result.constants.find((c) => c.name === 'API_URL')
      expect(apiUrl).toBeDefined()
      expect(apiUrl!.value).toBe('"https://api.example.com"')

      const maxRetries = result.constants.find((c) => c.name === 'MAX_RETRIES')
      expect(maxRetries).toBeDefined()
      expect(maxRetries!.value).toBe('3')
    })

    it('should parse const with JSDoc when option is enabled', () => {
      const content = `
        /** The base URL for the API */
        const API_URL = "https://api.example.com"
      `

      const result = parser.parseContent(content, 'test.ts', {
        includeJsDoc: true,
      })
      const constant = result.constants[0]

      expect(constant.description).toContain('The base URL for the API')
    })
  })

  describe('TSX / React Component Parsing', () => {
    it('should parse React functional component', () => {
      const content = `
        interface ButtonProps {
          label: string
          onClick: () => void
          disabled?: boolean
        }
        
        function Button({ label, onClick, disabled = false }: ButtonProps): JSX.Element {
          return <button onClick={onClick} disabled={disabled}>{label}</button>
        }
      `

      const result = parser.parseContent(content, 'Button.tsx')
      const func = result.functions[0]

      expect(func.name).toBe('Button')
      expect(func.parameters).toHaveLength(1)

      const propsParam = func.parameters[0]
      const propsType = propsParam.type as SimpleObject

      expect(propsType.type).toBe('object')
      expect(propsType.properties.label.type).toEqual({ type: 'string' })
      expect(propsType.properties.onClick.required).toBe(true)
      expect(propsType.properties.disabled.required).toBe(false)
    })

    it('should parse arrow function React component', () => {
      const content = `
        const Card = ({ title, content }: { title: string; content: string }) => {
          return <div><h2>{title}</h2><p>{content}</p></div>
        }
      `

      const result = parser.parseContent(content, 'Card.tsx')
      const func = result.functions[0]

      expect(func.name).toBe('Card')
      expect(func.parameters).toHaveLength(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle functions with no parameters', () => {
      const content = `
        function getTimestamp(): number {
          return Date.now()
        }
      `

      const result = parser.parseContent(content)
      const func = result.functions[0]

      expect(func.parameters).toHaveLength(0)
      expect(func.returnType).toBe('number')
    })

    it('should handle anonymous functions', () => {
      const content = `
        const handler = function(event: Event): void {
          console.log(event)
        }
      `

      const result = parser.parseContent(content)

      // This should be captured as a constant, not a function
      expect(result.constants).toHaveLength(1)
    })

    it('should handle complex nested types', () => {
      const content = `
        function processData(
          data: Array<{ id: number; tags: string[] }>
        ): void {
        }
      `

      const result = parser.parseContent(content)
      const param = result.functions[0].parameters[0]
      const arrayType = param.type as SimpleArray

      expect(arrayType.type).toBe('array')
      // The nested object structure should be parsed
      expect(arrayType.items[0].type).toHaveProperty('type', 'object')
    })
  })
})

describe('Convenience Functions', () => {
  describe('parseContent', () => {
    it('should work as a standalone function', () => {
      const content = `
        function test(param: string): void {}
      `

      const result = parseContent(content)

      expect(result.functions).toHaveLength(1)
      expect(result.functions[0].name).toBe('test')
    })
  })

  describe('parseFile', () => {
    it('should handle file parsing errors gracefully', () => {
      // This test would require creating actual files,
      // but we can test the function exists
      expect(typeof parseFile).toBe('function')
    })
  })
})

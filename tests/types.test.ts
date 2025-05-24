import { describe, expect, it } from 'vitest'
import type {
  SimpleArray,
  SimpleEnum,
  SimpleObject,
  SimpleParam,
  SimpleType,
} from '../src/types'

describe('Type Definitions', () => {
  describe('SimpleType', () => {
    it('should match README specification', () => {
      const stringType: SimpleType = { type: 'string' }
      const numberType: SimpleType = { type: 'number' }
      const booleanType: SimpleType = { type: 'boolean' }
      const dateType: SimpleType = { type: 'date' }

      expect(stringType.type).toBe('string')
      expect(numberType.type).toBe('number')
      expect(booleanType.type).toBe('boolean')
      expect(dateType.type).toBe('date')
    })

    it('should not allow invalid types', () => {
      // This test ensures TypeScript compilation would fail for invalid types
      // @ts-expect-error - invalid type should not be allowed
      const _invalidType: SimpleType = { type: 'invalid' }
      // The test framework won't see this error, but TypeScript will
      expect(_invalidType).toBeDefined() // Just to avoid unused variable warning
    })
  })

  describe('SimpleEnum', () => {
    it('should match README specification', () => {
      const enumType: SimpleEnum = {
        type: 'enum',
        values: ['active', 'inactive', 'pending'],
      }

      expect(enumType.type).toBe('enum')
      expect(enumType.values).toEqual(['active', 'inactive', 'pending'])
      expect(Array.isArray(enumType.values)).toBe(true)
    })

    it('should handle empty enum values', () => {
      const emptyEnum: SimpleEnum = {
        type: 'enum',
        values: [],
      }

      expect(emptyEnum.values).toHaveLength(0)
    })
  })

  describe('SimpleObject', () => {
    it('should match README specification', () => {
      const objectType: SimpleObject = {
        type: 'object',
        properties: {
          name: {
            name: 'name',
            type: { type: 'string' },
            description: 'User name',
            required: true,
            defaultValue: '',
          },
          age: {
            name: 'age',
            type: { type: 'number' },
            description: 'User age',
            required: false,
            defaultValue: '0',
          },
        },
      }

      expect(objectType.type).toBe('object')
      expect(objectType.properties.name.type).toEqual({ type: 'string' })
      expect(objectType.properties.age.required).toBe(false)
    })

    it('should handle nested objects', () => {
      const nestedObjectType: SimpleObject = {
        type: 'object',
        properties: {
          user: {
            name: 'user',
            type: {
              type: 'object',
              properties: {
                profile: {
                  name: 'profile',
                  type: { type: 'string' },
                  description: '',
                  required: true,
                  defaultValue: '',
                },
              },
            },
            description: '',
            required: true,
            defaultValue: '',
          },
        },
      }

      expect(nestedObjectType.properties.user.type).toHaveProperty(
        'type',
        'object',
      )
    })
  })

  describe('SimpleArray', () => {
    it('should match README specification', () => {
      const arrayType: SimpleArray = {
        type: 'array',
        items: [
          {
            name: 'item',
            type: { type: 'string' },
            description: 'Array item',
            required: true,
            defaultValue: '',
          },
        ],
      }

      expect(arrayType.type).toBe('array')
      expect(arrayType.items).toHaveLength(1)
      expect(arrayType.items[0].type).toEqual({ type: 'string' })
    })

    it('should handle arrays of objects', () => {
      const objectArrayType: SimpleArray = {
        type: 'array',
        items: [
          {
            name: 'item',
            type: {
              type: 'object',
              properties: {
                id: {
                  name: 'id',
                  type: { type: 'number' },
                  description: '',
                  required: true,
                  defaultValue: '',
                },
              },
            },
            description: '',
            required: true,
            defaultValue: '',
          },
        ],
      }

      expect(objectArrayType.items[0].type).toHaveProperty('type', 'object')
    })

    it('should handle arrays of enums', () => {
      const enumArrayType: SimpleArray = {
        type: 'array',
        items: [
          {
            name: 'item',
            type: {
              type: 'enum',
              values: ['red', 'green', 'blue'],
            },
            description: '',
            required: true,
            defaultValue: '',
          },
        ],
      }

      expect(enumArrayType.items[0].type).toHaveProperty('type', 'enum')
    })
  })

  describe('SimpleParam', () => {
    it('should match README specification exactly', () => {
      const param: SimpleParam = {
        name: 'username',
        type: { type: 'string' },
        description: 'The user name',
        required: true,
        defaultValue: '',
      }

      expect(param).toHaveProperty('name')
      expect(param).toHaveProperty('type')
      expect(param).toHaveProperty('description')
      expect(param).toHaveProperty('required')
      expect(param).toHaveProperty('defaultValue')

      expect(typeof param.name).toBe('string')
      expect(typeof param.description).toBe('string')
      expect(typeof param.required).toBe('boolean')
      expect(typeof param.defaultValue).toBe('string')
    })

    it('should support all type variations', () => {
      const stringParam: SimpleParam = {
        name: 'text',
        type: { type: 'string' },
        description: '',
        required: true,
        defaultValue: '',
      }

      const enumParam: SimpleParam = {
        name: 'status',
        type: { type: 'enum', values: ['active', 'inactive'] },
        description: '',
        required: true,
        defaultValue: '',
      }

      const objectParam: SimpleParam = {
        name: 'config',
        type: {
          type: 'object',
          properties: {
            enabled: {
              name: 'enabled',
              type: { type: 'boolean' },
              description: '',
              required: true,
              defaultValue: '',
            },
          },
        },
        description: '',
        required: true,
        defaultValue: '',
      }

      const arrayParam: SimpleParam = {
        name: 'items',
        type: {
          type: 'array',
          items: [
            {
              name: 'item',
              type: { type: 'number' },
              description: '',
              required: true,
              defaultValue: '',
            },
          ],
        },
        description: '',
        required: true,
        defaultValue: '',
      }

      expect(stringParam.type).toEqual({ type: 'string' })
      expect(enumParam.type).toHaveProperty('type', 'enum')
      expect(objectParam.type).toHaveProperty('type', 'object')
      expect(arrayParam.type).toHaveProperty('type', 'array')
    })
  })

  describe('Type Union Compatibility', () => {
    it('should accept all valid type combinations', () => {
      const types: (SimpleType | SimpleEnum | SimpleObject | SimpleArray)[] = [
        { type: 'string' },
        { type: 'number' },
        { type: 'boolean' },
        { type: 'date' },
        { type: 'enum', values: ['a', 'b'] },
        { type: 'object', properties: {} },
        { type: 'array', items: [] },
      ]

      types.forEach((type) => {
        const param: SimpleParam = {
          name: 'test',
          type,
          description: '',
          required: true,
          defaultValue: '',
        }
        expect(param.type).toBeDefined()
      })
    })
  })
})

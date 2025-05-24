export type SimpleType = {
  type: 'string' | 'number' | 'boolean' | 'date'
}

export type SimpleEnum = {
  type: 'enum'
  values: string[]
}

export type SimpleObject = {
  type: 'object'
  properties: {
    [key: string]: SimpleParam
  }
}

export type SimpleArray = {
  type: 'array'
  items: SimpleParam[]
}

export type SimpleParam = {
  name: string
  type: SimpleType | SimpleEnum | SimpleObject | SimpleArray
  description: string
  required: boolean
  defaultValue: string
}

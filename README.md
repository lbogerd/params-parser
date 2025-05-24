This is a module for parsing parameters for TypeScript function.
- Searching a file for all functions and const declarations
- Parsing normal TypeScript files
- Parsing TSX files, specifically React components
- Full type inference

Uses [ts-morph](https://github.com/dsherret/ts-morph) for parsing. 

Outputs the following simplified SimpleParam type:
```typescript
type SimpleParam = {
  name: string;
  type: SimpleType | SimpleEnum | SimpleObject | SimpleArray;
  description: string;
  required: boolean;
  defaultValue: string;
}

type SimpleType = {
  type: 'string' | 'number' | 'boolean' | 'date'
}

type SimpleEnum = {
  type: 'enum';
  values: string[];
}

type SimpleObject = {
  type: 'object';
  properties: {
    [key: string]: SimpleParam;
  }
}

type SimpleArray = {
  type: 'array';
  items: SimpleParam[];
}
```

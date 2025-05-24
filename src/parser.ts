import {
  Project,
  SyntaxKind,
  type FunctionDeclaration,
  type ParameterDeclaration,
  type PropertySignature,
  type SourceFile,
  type Type,
  type TypeNode,
  type VariableDeclaration,
} from 'ts-morph'
import type {
  SimpleArray,
  SimpleEnum,
  SimpleObject,
  SimpleParam,
  SimpleType,
} from './types'

export interface ParseOptions {
  includeJsDoc?: boolean
  includeDefaultValues?: boolean
}

export interface ParseResult {
  functions: FunctionInfo[]
  constants: ConstInfo[]
}

export interface FunctionInfo {
  name: string
  parameters: SimpleParam[]
  returnType?: string
  description?: string
}

export interface ConstInfo {
  name: string
  type: string
  value?: string
  description?: string
}

export class ParamsParser {
  private project: Project

  constructor() {
    this.project = new Project({
      compilerOptions: {
        target: 99, // Latest
        allowJs: true,
        declaration: true,
      },
    })
  }

  /**
   * Parse a TypeScript or TSX file from file path
   */
  parseFile(filePath: string, options: ParseOptions = {}): ParseResult {
    const sourceFile = this.project.addSourceFileAtPath(filePath)
    return this.parseSourceFile(sourceFile, options)
  }

  /**
   * Parse TypeScript or TSX content from string
   */
  parseContent(
    content: string,
    fileName = 'temp.ts',
    options: ParseOptions = {},
  ): ParseResult {
    const sourceFile = this.project.createSourceFile(fileName, content, {
      overwrite: true,
    })
    return this.parseSourceFile(sourceFile, options)
  }

  private parseSourceFile(
    sourceFile: SourceFile,
    options: ParseOptions,
  ): ParseResult {
    const functions = this.extractFunctions(sourceFile, options)
    const constants = this.extractConstants(sourceFile, options)

    return {
      functions,
      constants,
    }
  }

  private extractFunctions(
    sourceFile: SourceFile,
    options: ParseOptions,
  ): FunctionInfo[] {
    const functions: FunctionInfo[] = []

    // Extract function declarations
    sourceFile.getFunctions().forEach((func) => {
      functions.push(this.parseFunctionDeclaration(func, options))
    })

    // Extract arrow functions assigned to variables/constants
    sourceFile.getVariableDeclarations().forEach((variable) => {
      const initializer = variable.getInitializer()
      if (initializer && initializer.getKind() === SyntaxKind.ArrowFunction) {
        const funcInfo = this.parseArrowFunction(variable, options)
        if (funcInfo) {
          functions.push(funcInfo)
        }
      }
    })

    return functions
  }

  private extractConstants(
    sourceFile: SourceFile,
    options: ParseOptions,
  ): ConstInfo[] {
    const constants: ConstInfo[] = []

    sourceFile.getVariableDeclarations().forEach((variable) => {
      const initializer = variable.getInitializer()
      if (initializer && initializer.getKind() !== SyntaxKind.ArrowFunction) {
        constants.push({
          name: variable.getName(),
          type: variable.getType().getText(),
          value: initializer.getText(),
          description: options.includeJsDoc
            ? this.getJsDocDescription(variable)
            : undefined,
        })
      }
    })

    return constants
  }

  private parseFunctionDeclaration(
    func: FunctionDeclaration,
    options: ParseOptions,
  ): FunctionInfo {
    return {
      name: func.getName() || 'anonymous',
      parameters: func
        .getParameters()
        .map((param) => this.parseParameter(param, options)),
      returnType: func.getReturnTypeNode()?.getText(),
      description: options.includeJsDoc
        ? this.getJsDocDescription(func)
        : undefined,
    }
  }

  private parseArrowFunction(
    variable: VariableDeclaration,
    options: ParseOptions,
  ): FunctionInfo | null {
    const initializer = variable.getInitializer()
    if (!initializer || initializer.getKind() !== SyntaxKind.ArrowFunction) {
      return null
    }

    const arrowFunc = initializer.asKind(SyntaxKind.ArrowFunction)
    if (!arrowFunc) return null

    return {
      name: variable.getName(),
      parameters: arrowFunc
        .getParameters()
        .map((param) => this.parseParameter(param, options)),
      returnType: arrowFunc.getReturnTypeNode()?.getText(),
      description: options.includeJsDoc
        ? this.getJsDocDescription(variable)
        : undefined,
    }
  }

  private parseParameter(
    param: ParameterDeclaration,
    options: ParseOptions,
  ): SimpleParam {
    const name = param.getName()
    const type = this.parseType(param.getTypeNode(), param.getType())
    const required = !param.hasQuestionToken() && !param.hasInitializer()
    const defaultValue = options.includeDefaultValues
      ? param.getInitializer()?.getText() || ''
      : ''
    const description = options.includeJsDoc
      ? this.getJsDocParamDescription(param)
      : ''

    return {
      name,
      type,
      description,
      required,
      defaultValue,
    }
  }

  private parseType(
    typeNode: TypeNode | undefined,
    compilerType: Type,
  ): SimpleType | SimpleEnum | SimpleObject | SimpleArray {
    // First try to parse from TypeNode if available
    if (typeNode) {
      const result = this.parseTypeNode(typeNode)
      if (result) return result
    }

    // Fallback to compiler type analysis
    return this.parseCompilerType(compilerType)
  }

  private parseTypeNode(
    typeNode: TypeNode,
  ): SimpleType | SimpleEnum | SimpleObject | SimpleArray | null {
    const kind = typeNode.getKind()

    switch (kind) {
      case SyntaxKind.StringKeyword:
        return { type: 'string' }

      case SyntaxKind.NumberKeyword:
        return { type: 'number' }

      case SyntaxKind.BooleanKeyword:
        return { type: 'boolean' }

      case SyntaxKind.ArrayType: {
        const arrayType = typeNode.asKind(SyntaxKind.ArrayType)!
        const elementType:
          | SimpleType
          | SimpleEnum
          | SimpleObject
          | SimpleArray = this.parseTypeNode(
          arrayType.getElementTypeNode(),
        ) || { type: 'string' }

        return {
          type: 'array',
          items: [
            {
              name: 'item',
              type: elementType,
              description: '',
              required: true,
              defaultValue: '',
            },
          ],
        }
      }
      case SyntaxKind.TypeReference: {
        const typeRef = typeNode.asKind(SyntaxKind.TypeReference)!
        const typeName = typeRef.getTypeName().getText()

        // Handle Date type
        if (typeName === 'Date') {
          return { type: 'date' }
        }

        // Handle Array<T> syntax
        if (typeName === 'Array') {
          const typeArgs = typeRef.getTypeArguments()
          if (typeArgs.length > 0) {
            const elementType:
              | SimpleType
              | SimpleEnum
              | SimpleObject
              | SimpleArray = this.parseTypeNode(typeArgs[0]) || {
              type: 'string',
            }

            return {
              type: 'array',
              items: [
                {
                  name: 'item',
                  type: elementType,
                  description: '',
                  required: true,
                  defaultValue: '',
                },
              ],
            }
          }
        }

        // For other type references (interfaces, type aliases), we need to resolve them
        // This is complex, so we'll return null to fall back to compiler type analysis
        return null
      }
      case SyntaxKind.UnionType: {
        const unionType = typeNode.asKind(SyntaxKind.UnionType)!
        const types = unionType.getTypeNodes()

        // Check if it's a string literal union (enum-like)
        const literalValues: string[] = []
        let allLiterals = true

        for (const type of types) {
          if (type.getKind() === SyntaxKind.LiteralType) {
            const literal = type.asKind(SyntaxKind.LiteralType)!
            const value = literal.getLiteral().getText().replaceAll(/['"]/g, '')
            literalValues.push(value)
          } else {
            allLiterals = false
            break
          }
        }

        if (allLiterals && literalValues.length > 0) {
          return {
            type: 'enum',
            values: literalValues,
          }
        }

        // For other unions, return the first type as fallback
        return this.parseTypeNode(types[0])
      }
      case SyntaxKind.TypeLiteral: {
        const typeLiteral = typeNode.asKind(SyntaxKind.TypeLiteral)!
        const properties: { [key: string]: SimpleParam } = {}

        typeLiteral.getProperties().forEach((prop) => {
          if (prop.getKind() === SyntaxKind.PropertySignature) {
            const propSignature = prop as PropertySignature
            const propName = propSignature.getName()
            const propTypeNode = propSignature.getTypeNode()
            const propType:
              | SimpleType
              | SimpleEnum
              | SimpleObject
              | SimpleArray = propTypeNode
              ? this.parseTypeNode(propTypeNode) || { type: 'string' }
              : { type: 'string' }

            properties[propName] = {
              name: propName,
              type: propType,
              description: '',
              required: !propSignature.hasQuestionToken(),
              defaultValue: '',
            }
          }
        })

        return {
          type: 'object',
          properties,
        }
      }
      default:
        return null
    }
  }

  private parseCompilerType(
    compilerType: Type,
  ): SimpleType | SimpleEnum | SimpleObject | SimpleArray {
    const typeText = compilerType.getText()

    // Handle array types
    if (typeText.includes('[]') || typeText.startsWith('Array<')) {
      const stringType: SimpleType = { type: 'string' }
      return {
        type: 'array',
        items: [
          {
            name: 'item',
            type: stringType,
            description: '',
            required: true,
            defaultValue: '',
          },
        ],
      }
    }

    // Handle basic types
    if (typeText.includes('string') || typeText === 'string')
      return { type: 'string' }
    if (typeText.includes('number') || typeText === 'number')
      return { type: 'number' }
    if (typeText.includes('boolean') || typeText === 'boolean')
      return { type: 'boolean' }
    if (typeText.includes('Date') || typeText === 'Date')
      return { type: 'date' }

    // Try to get properties from the type (for interfaces and object types)
    try {
      const symbol = compilerType.getSymbol()
      if (symbol) {
        const properties: { [key: string]: SimpleParam } = {}
        const declarations = symbol.getDeclarations()

        // Look for interface or type alias declarations
        for (const declaration of declarations) {
          if (declaration.getKind() !== SyntaxKind.InterfaceDeclaration)
            continue

          const interfaceDecl = declaration.asKind(
            SyntaxKind.InterfaceDeclaration,
          )

          if (!interfaceDecl) continue

          for (const prop of interfaceDecl.getProperties()) {
            if (prop.getKind() !== SyntaxKind.PropertySignature) continue

            const propSignature = prop
            const propName = propSignature.getName()
            const propTypeNode = propSignature.getTypeNode()

            const defaultType: SimpleType = { type: 'string' }
            const propType = propTypeNode
              ? this.parseTypeNode(propTypeNode) || defaultType
              : defaultType

            properties[propName] = {
              name: propName,
              type: propType,
              description: '',
              required: !propSignature.hasQuestionToken(),
              defaultValue: propSignature.getInitializer()?.getText(),
            }
          }

          if (Object.keys(properties).length > 0) {
            return {
              type: 'object',
              properties,
            }
          }
        }
      }
    } catch {
      // If we can't analyze the type structure, continue with fallbacks
    }

    // Handle object-like types (fallback)
    if (typeText.includes('{') || typeText.includes('interface')) {
      return {
        type: 'object',
        properties: {},
      }
    }

    // Default fallback
    return { type: 'string' }
  }

  private getJsDocDescription(
    node: FunctionDeclaration | VariableDeclaration,
  ): string {
    try {
      // For variable declarations, JSDoc might be on various parent nodes
      if (node.getKind() === SyntaxKind.VariableDeclaration) {
        // Try immediate parent (VariableDeclarationList)
        const parent = node.getParent()
        if (
          parent &&
          'getJsDocs' in parent &&
          typeof parent.getJsDocs === 'function'
        ) {
          const jsDocs = parent.getJsDocs()
          if (jsDocs.length > 0) {
            return jsDocs[0].getDescription() || ''
          }
        }

        // Try grandparent (VariableStatement)
        if (parent) {
          const grandParent = parent.getParent()
          if (
            grandParent &&
            'getJsDocs' in grandParent &&
            typeof grandParent.getJsDocs === 'function'
          ) {
            const jsDocs = grandParent.getJsDocs()
            if (jsDocs.length > 0) {
              return jsDocs[0].getDescription() || ''
            }
          }
        }

        // Alternative approach: look for leading comments
        const sourceFile = node.getSourceFile()
        const fullText = sourceFile.getFullText()
        const nodeStart = node.getStart()

        // Look backwards for JSDoc-style comments (simplified regex to avoid backtracking)
        const textBefore = fullText.slice(0, nodeStart)
        const jsDocMatch = textBefore.match(/\/\*\*([\s\S]*?)\*\/\s*$/)
        if (jsDocMatch) {
          return jsDocMatch[1].replaceAll('*', '').trim()
        }
      }

      // For function declarations or if parent check didn't work
      if ('getJsDocs' in node && typeof node.getJsDocs === 'function') {
        const jsDocs = node.getJsDocs()
        if (jsDocs.length > 0) {
          return jsDocs[0].getDescription() || ''
        }
      }
    } catch {
      // Ignore JSDoc parsing errors
    }
    return ''
  }

  private getJsDocParamDescription(param: ParameterDeclaration): string {
    try {
      const func = param.getParent()
      if ('getJsDocs' in func && typeof func.getJsDocs === 'function') {
        const jsDocs = func.getJsDocs()

        for (const jsDoc of jsDocs) {
          const paramTags = jsDoc
            .getTags()
            .filter((tag: any) => tag.getTagName() === 'param')
          for (const paramTag of paramTags) {
            const comment = paramTag.getComment()
            const paramName = param.getName()
            if (
              comment &&
              typeof comment === 'string' &&
              comment.includes(paramName)
            ) {
              return comment
            }
          }
        }
      }
    } catch {
      // Ignore JSDoc parsing errors
    }

    return ''
  }
}

// Convenience functions
export function parseFile(
  filePath: string,
  options: ParseOptions = {},
): ParseResult {
  const parser = new ParamsParser()
  return parser.parseFile(filePath, options)
}

export function parseContent(
  content: string,
  fileName = 'temp.ts',
  options: ParseOptions = {},
): ParseResult {
  const parser = new ParamsParser()
  return parser.parseContent(content, fileName, options)
}

/**
 * 🏛️ ARCHITECTURE FITNESS FUNCTIONS
 * 
 * Ces tests garantissent le respect des principes hexagonaux
 * EXÉCUTER: npm run test:arch
 * 
 * Règles testées:
 * - Domain isolé (pas de dépendances externes)
 * - Application dépend uniquement du Domain
 * - Infrastructure implémente les Ports
 * - Pas d'imports cross-module
 * - Naming conventions respectées
 */

import * as fs from 'fs';
import * as path from 'path';

describe('🏛️ Architecture Hexagonale - Fitness Functions', () => {
  const MODULES = ['users', 'events', 'tickets', 'payments', 'notifications', 'analytics'];
  const FORBIDDEN_DOMAIN_IMPORTS = [
    '@nestjs',
    'typeorm',
    'express',
    'axios',
    'ioredis',
    '@aws-sdk',
  ];
  const FORBIDDEN_APPLICATION_IMPORTS = [
    'typeorm',
    'express',
    'ioredis',
    '@aws-sdk',
  ];

  /**
   * Helper: Récupère tous les fichiers .ts d'un dossier
   */
  function getTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;

    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        getTypeScriptFiles(filePath, fileList);
      } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts')) {
        fileList.push(filePath);
      }
    });
    return fileList;
  }

  /**
   * Helper: Extrait les imports d'un fichier
   */
  function extractImports(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Helper: Vérifie si un import est externe
   */
  function isExternalImport(importPath: string): boolean {
    return !importPath.startsWith('.') && !importPath.startsWith('/');
  }

  /**
   * Helper: Vérifie si un import est interdit
   */
  function hasForbiddenImport(imports: string[], forbidden: string[]): string | null {
    for (const imp of imports) {
      for (const forbid of forbidden) {
        if (imp.startsWith(forbid)) {
          return imp;
        }
      }
    }
    return null;
  }

  describe('📦 1. Isolation des Modules', () => {
    it('Chaque module doit avoir sa structure hexagonale', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) {
        console.warn('⚠️ src/modules/ not found yet (normal if project not started)');
        return;
      }

      MODULES.forEach((module) => {
        const modulePath = path.join(srcPath, module);
        if (!fs.existsSync(modulePath)) {
          console.warn(`⚠️ Module ${module} not found yet`);
          return;
        }

        const expectedDirs = ['domain', 'application', 'infrastructure'];
        expectedDirs.forEach((dir) => {
          const dirPath = path.join(modulePath, dir);
          expect(fs.existsSync(dirPath)).toBe(true);
        });
      });
    });

    it('Les modules ne doivent pas importer d\'autres modules directement', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const modulePath = path.join(srcPath, module);
        if (!fs.existsSync(modulePath)) return;

        const files = getTypeScriptFiles(modulePath);
        files.forEach((file) => {
          const imports = extractImports(file);
          const crossModuleImports = imports.filter((imp) => {
            return MODULES.some(
              (otherModule) =>
                otherModule !== module && imp.includes(`modules/${otherModule}`),
            );
          });

          expect(crossModuleImports).toEqual([]);
          if (crossModuleImports.length > 0) {
            console.error(
              `❌ ${file} importe d'autres modules: ${crossModuleImports.join(', ')}`,
            );
          }
        });
      });
    });
  });

  describe('🎯 2. Domain Layer - Pureté', () => {
    it('Domain ne doit avoir AUCUNE dépendance externe (framework, DB, etc)', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const domainPath = path.join(srcPath, module, 'domain');
        if (!fs.existsSync(domainPath)) return;

        const domainFiles = getTypeScriptFiles(domainPath);
        domainFiles.forEach((file) => {
          const imports = extractImports(file);
          const externalImports = imports.filter(isExternalImport);
          const forbiddenImport = hasForbiddenImport(
            externalImports,
            FORBIDDEN_DOMAIN_IMPORTS,
          );

          expect(forbiddenImport).toBeNull();
          if (forbiddenImport) {
            console.error(
              `❌ Domain file ${file} imports forbidden dependency: ${forbiddenImport}`,
            );
            console.error(
              `   → Domain must be PURE TypeScript (no @nestjs, typeorm, express, etc)`,
            );
          }
        });
      });
    });

    it('Entités Domain doivent être dans domain/entities/', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const entitiesPath = path.join(srcPath, module, 'domain/entities');
        if (!fs.existsSync(entitiesPath)) return;

        const entityFiles = fs.readdirSync(entitiesPath).filter((f) => f.endsWith('.ts'));
        entityFiles.forEach((file) => {
          // Entity files should follow naming: *.entity.ts
          expect(file).toMatch(/\.entity\.ts$/);
        });
      });
    });

    it('Value Objects doivent être dans domain/value-objects/', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const voPath = path.join(srcPath, module, 'domain/value-objects');
        if (!fs.existsSync(voPath)) return;

        const voFiles = fs.readdirSync(voPath).filter((f) => f.endsWith('.ts'));
        voFiles.forEach((file) => {
          // VO files should follow naming: *.vo.ts
          expect(file).toMatch(/\.vo\.ts$/);
        });
      });
    });

    it('Domain Events doivent être dans domain/events/', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const eventsPath = path.join(srcPath, module, 'domain/events');
        if (!fs.existsSync(eventsPath)) return;

        const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.ts'));
        eventFiles.forEach((file) => {
          // Event files should follow naming: *.event.ts
          expect(file).toMatch(/\.event\.ts$/);
        });
      });
    });
  });

  describe('⚙️ 3. Application Layer - Use Cases', () => {
    it('Application ne doit pas importer TypeORM, Express, AWS SDK', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const appPath = path.join(srcPath, module, 'application');
        if (!fs.existsSync(appPath)) return;

        const appFiles = getTypeScriptFiles(appPath);
        appFiles.forEach((file) => {
          const imports = extractImports(file);
          const externalImports = imports.filter(isExternalImport);
          const forbiddenImport = hasForbiddenImport(
            externalImports,
            FORBIDDEN_APPLICATION_IMPORTS,
          );

          expect(forbiddenImport).toBeNull();
          if (forbiddenImport) {
            console.error(
              `❌ Application file ${file} imports forbidden dependency: ${forbiddenImport}`,
            );
            console.error(
              `   → Application can use @nestjs/cqrs but NOT typeorm, express, AWS SDK`,
            );
          }
        });
      });
    });

    it('Commands doivent être dans application/commands/', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const commandsPath = path.join(srcPath, module, 'application/commands');
        if (!fs.existsSync(commandsPath)) return;

        const commandFiles = getTypeScriptFiles(commandsPath);
        commandFiles.forEach((file) => {
          const fileName = path.basename(file);
          // Command/Handler files should follow naming
          expect(
            fileName.includes('.command.ts') || fileName.includes('.handler.ts'),
          ).toBe(true);
        });
      });
    });

    it('Queries doivent être dans application/queries/', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const queriesPath = path.join(srcPath, module, 'application/queries');
        if (!fs.existsSync(queriesPath)) return;

        const queryFiles = getTypeScriptFiles(queriesPath);
        queryFiles.forEach((file) => {
          const fileName = path.basename(file);
          // Query/Handler files should follow naming
          expect(fileName.includes('.query.ts') || fileName.includes('.handler.ts')).toBe(
            true,
          );
        });
      });
    });

    it('Ports (interfaces) doivent être dans application/ports/', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const portsPath = path.join(srcPath, module, 'application/ports');
        if (!fs.existsSync(portsPath)) return;

        const portFiles = fs.readdirSync(portsPath).filter((f) => f.endsWith('.ts'));
        portFiles.forEach((file) => {
          // Port files should follow naming: *.port.ts
          expect(file).toMatch(/\.port\.ts$/);

          // Check that file exports interface or abstract class
          const filePath = path.join(portsPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const hasInterface = /export\s+interface\s+/g.test(content);
          const hasAbstractClass = /export\s+abstract\s+class\s+/g.test(content);

          expect(hasInterface || hasAbstractClass).toBe(true);
          if (!hasInterface && !hasAbstractClass) {
            console.error(
              `❌ Port file ${file} should export interface or abstract class`,
            );
          }
        });
      });
    });
  });

  describe('🔌 4. Infrastructure Layer - Adapters', () => {
    it('Repositories doivent être dans infrastructure/repositories/', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const repoPath = path.join(srcPath, module, 'infrastructure/repositories');
        if (!fs.existsSync(repoPath)) return;

        const repoFiles = fs.readdirSync(repoPath).filter((f) => f.endsWith('.ts'));
        repoFiles.forEach((file) => {
          // Repository files should follow naming: *.repository.ts
          expect(file).toMatch(/\.repository\.ts$/);

          // Check that repository implements a Port
          const filePath = path.join(repoPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const implementsPort = /implements\s+\w+Port/g.test(content);

          expect(implementsPort).toBe(true);
          if (!implementsPort) {
            console.error(
              `❌ Repository ${file} should implement a Port interface from application/ports/`,
            );
          }
        });
      });
    });

    it('Controllers doivent être dans infrastructure/controllers/', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const controllerPath = path.join(srcPath, module, 'infrastructure/controllers');
        if (!fs.existsSync(controllerPath)) return;

        const controllerFiles = fs
          .readdirSync(controllerPath)
          .filter((f) => f.endsWith('.ts'));
        controllerFiles.forEach((file) => {
          // Controller files should follow naming: *.controller.ts
          expect(file).toMatch(/\.controller\.ts$/);

          // Check that controller has @Controller decorator
          const filePath = path.join(controllerPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const hasControllerDecorator = /@Controller\(/g.test(content);

          expect(hasControllerDecorator).toBe(true);
          if (!hasControllerDecorator) {
            console.error(`❌ Controller ${file} should have @Controller() decorator`);
          }
        });
      });
    });

    it('Adapters doivent être dans infrastructure/adapters/', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const adapterPath = path.join(srcPath, module, 'infrastructure/adapters');
        if (!fs.existsSync(adapterPath)) return;

        const adapterFiles = fs.readdirSync(adapterPath).filter((f) => f.endsWith('.ts'));
        adapterFiles.forEach((file) => {
          // Adapter files should follow naming: *.adapter.ts
          expect(file).toMatch(/\.adapter\.ts$/);
        });
      });
    });

    it('Module NestJS doit être dans infrastructure/', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const infraPath = path.join(srcPath, module, 'infrastructure');
        if (!fs.existsSync(infraPath)) return;

        const moduleFile = path.join(infraPath, `${module}.module.ts`);
        if (fs.existsSync(moduleFile)) {
          const content = fs.readFileSync(moduleFile, 'utf-8');
          const hasModuleDecorator = /@Module\(/g.test(content);

          expect(hasModuleDecorator).toBe(true);
          if (!hasModuleDecorator) {
            console.error(
              `❌ ${module}.module.ts should have @Module() decorator`,
            );
          }
        }
      });
    });
  });

  describe('🗄️ 5. Database - Schema Isolation', () => {
    it('Chaque module doit utiliser son propre schema PostgreSQL', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const infraPath = path.join(srcPath, module, 'infrastructure');
        if (!fs.existsSync(infraPath)) return;

        const entityFiles = getTypeScriptFiles(infraPath).filter((f) =>
          f.includes('entities') && f.endsWith('.entity.ts'),
        );

        entityFiles.forEach((file) => {
          const content = fs.readFileSync(file, 'utf-8');
          const hasSchemaDecorator = /@Entity\(.*schema:\s*['"](\w+)['"]/g.test(content);

          if (hasSchemaDecorator) {
            const match = /@Entity\(.*schema:\s*['"](\w+)['"]/g.exec(content);
            const schema = match ? match[1] : null;

            // Schema should match module name
            expect(schema).toBe(module);
            if (schema !== module) {
              console.error(
                `❌ Entity in ${file} uses schema '${schema}' but should use '${module}'`,
              );
            }
          }
        });
      });
    });

    it('Pas de Foreign Keys entre schémas différents', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const infraPath = path.join(srcPath, module, 'infrastructure');
        if (!fs.existsSync(infraPath)) return;

        const entityFiles = getTypeScriptFiles(infraPath).filter((f) =>
          f.includes('entities') && f.endsWith('.entity.ts'),
        );

        entityFiles.forEach((file) => {
          const content = fs.readFileSync(file, 'utf-8');

          // Check for @ManyToOne, @OneToMany, @OneToOne, @ManyToMany to other modules
          const relationRegex = /@(ManyToOne|OneToMany|OneToOne|ManyToMany)\(\s*\(\)\s*=>\s*(\w+)/g;
          let match;

          while ((match = relationRegex.exec(content)) !== null) {
            const relatedEntity = match[2];

            // Check if related entity is imported from another module
            const imports = extractImports(file);
            const crossModuleRelation = imports.some((imp) => {
              return (
                MODULES.some((otherModule) => otherModule !== module && imp.includes(otherModule)) &&
                imp.includes(relatedEntity)
              );
            });

            expect(crossModuleRelation).toBe(false);
            if (crossModuleRelation) {
              console.error(
                `❌ ${file} has relation to entity from another module: ${relatedEntity}`,
              );
              console.error(
                `   → Use IDs only, no TypeORM relations between modules`,
              );
            }
          }
        });
      });
    });
  });

  describe('📢 6. Event-Driven Communication', () => {
    it('Domain Events doivent hériter de base DomainEvent', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const eventsPath = path.join(srcPath, module, 'domain/events');
        if (!fs.existsSync(eventsPath)) return;

        const eventFiles = getTypeScriptFiles(eventsPath);
        eventFiles.forEach((file) => {
          const content = fs.readFileSync(file, 'utf-8');

          // Check if class extends or implements DomainEvent
          const extendsDomainEvent = /class\s+\w+\s+(extends|implements)\s+\w*DomainEvent/g.test(
            content,
          );

          expect(extendsDomainEvent).toBe(true);
          if (!extendsDomainEvent) {
            console.error(
              `❌ Event in ${file} should extend/implement DomainEvent base class`,
            );
          }
        });
      });
    });

    it('Communication inter-module uniquement via Events (pas d\'imports directs)', () => {
      // Already covered in "Isolation des Modules" test
      // This is a reminder that modules communicate via EventBus only
      expect(true).toBe(true);
    });
  });

  describe('📝 7. Naming Conventions', () => {
    const namingRules = [
      { pattern: /\.entity\.ts$/, layer: 'domain/entities' },
      { pattern: /\.vo\.ts$/, layer: 'domain/value-objects' },
      { pattern: /\.event\.ts$/, layer: 'domain/events' },
      { pattern: /\.command\.ts$/, layer: 'application/commands' },
      { pattern: /\.query\.ts$/, layer: 'application/queries' },
      { pattern: /\.handler\.ts$/, layer: 'application/(commands|queries)' },
      { pattern: /\.port\.ts$/, layer: 'application/ports' },
      { pattern: /\.controller\.ts$/, layer: 'infrastructure/controllers' },
      { pattern: /\.repository\.ts$/, layer: 'infrastructure/repositories' },
      { pattern: /\.adapter\.ts$/, layer: 'infrastructure/adapters' },
      { pattern: /\.module\.ts$/, layer: 'infrastructure' },
    ];

    it('Fichiers doivent respecter les conventions de nommage', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const modulePath = path.join(srcPath, module);
        if (!fs.existsSync(modulePath)) return;

        const allFiles = getTypeScriptFiles(modulePath);

        allFiles.forEach((file) => {
          const fileName = path.basename(file);
          const relativePath = path.relative(modulePath, file);

          // Find matching naming rule
          const matchingRule = namingRules.find((rule) => rule.pattern.test(fileName));

          if (matchingRule) {
            const layerMatch = relativePath.includes(matchingRule.layer.split('/')[0]);
            expect(layerMatch).toBe(true);

            if (!layerMatch) {
              console.error(
                `❌ File ${fileName} should be in ${matchingRule.layer}/ but found in ${relativePath}`,
              );
            }
          }
        });
      });
    });

    it('Classes doivent avoir des suffixes appropriés', () => {
      const classSuffixes = {
        'entity.ts': ['Entity'],
        'vo.ts': ['VO', 'ValueObject'],
        'event.ts': ['Event'],
        'command.ts': ['Command'],
        'query.ts': ['Query'],
        'handler.ts': ['Handler'],
        'port.ts': ['Port', 'Interface'],
        'controller.ts': ['Controller'],
        'repository.ts': ['Repository'],
        'adapter.ts': ['Adapter'],
        'module.ts': ['Module'],
      };

      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const modulePath = path.join(srcPath, module);
        if (!fs.existsSync(modulePath)) return;

        const allFiles = getTypeScriptFiles(modulePath);

        allFiles.forEach((file) => {
          const fileName = path.basename(file);
          const content = fs.readFileSync(file, 'utf-8');

          // Extract class names
          const classRegex = /export\s+(class|interface|abstract\s+class)\s+(\w+)/g;
          let match;

          while ((match = classRegex.exec(content)) !== null) {
            const className = match[2];

            // Check if class name has appropriate suffix based on file name
            Object.entries(classSuffixes).forEach(([filePattern, suffixes]) => {
              if (fileName.includes(filePattern)) {
                const hasSuffix = suffixes.some((suffix) => className.endsWith(suffix));
                expect(hasSuffix).toBe(true);

                if (!hasSuffix) {
                  console.error(
                    `❌ Class '${className}' in ${fileName} should end with: ${suffixes.join(' or ')}`,
                  );
                }
              }
            });
          }
        });
      });
    });
  });

  describe('✅ 8. Code Quality Rules', () => {
    it('Pas de console.log dans le code production', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const modulePath = path.join(srcPath, module);
        if (!fs.existsSync(modulePath)) return;

        const allFiles = getTypeScriptFiles(modulePath);

        allFiles.forEach((file) => {
          const content = fs.readFileSync(file, 'utf-8');
          const hasConsoleLog = /console\.(log|debug|info|warn|error)\(/g.test(content);

          expect(hasConsoleLog).toBe(false);
          if (hasConsoleLog) {
            console.warn(
              `⚠️ ${file} contains console.log/debug/etc - use Logger instead`,
            );
          }
        });
      });
    });

    it('Exceptions métier doivent être dans domain/exceptions/', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const exceptionsPath = path.join(srcPath, module, 'domain/exceptions');
        if (!fs.existsSync(exceptionsPath)) return;

        const exceptionFiles = fs
          .readdirSync(exceptionsPath)
          .filter((f) => f.endsWith('.ts'));

        exceptionFiles.forEach((file) => {
          // Exception files should follow naming: *.exception.ts
          expect(file).toMatch(/\.exception\.ts$/);

          // Check that exception extends Error
          const filePath = path.join(exceptionsPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const extendsError = /class\s+\w+\s+extends\s+(Error|\w*Exception)/g.test(
            content,
          );

          expect(extendsError).toBe(true);
          if (!extendsError) {
            console.error(
              `❌ Exception in ${file} should extend Error or base Exception class`,
            );
          }
        });
      });
    });

    it('DTOs doivent utiliser class-validator decorators', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const controllerPath = path.join(srcPath, module, 'infrastructure/controllers');
        if (!fs.existsSync(controllerPath)) return;

        const dtoFiles = getTypeScriptFiles(controllerPath).filter((f) =>
          f.includes('dto') || f.includes('request'),
        );

        dtoFiles.forEach((file) => {
          const content = fs.readFileSync(file, 'utf-8');

          // Check if DTO has validation decorators
          const hasValidation = /@(IsString|IsNumber|IsEmail|IsNotEmpty|IsOptional|IsArray|IsBoolean|IsDate|IsEnum|IsUUID|Min|Max|Length|Matches)\(/g.test(
            content,
          );

          if (!hasValidation) {
            console.warn(
              `⚠️ DTO in ${file} should use class-validator decorators (@IsString, @IsNotEmpty, etc)`,
            );
          }
        });
      });
    });
  });

  describe('🧪 9. Test Structure', () => {
    it('Chaque module doit avoir des tests unitaires', () => {
      const testPath = path.join(__dirname, '../unit');
      if (!fs.existsSync(testPath)) {
        console.warn('⚠️ test/unit/ directory not found yet');
        return;
      }

      const srcModulesPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcModulesPath)) {
        console.warn('⚠️ src/modules/ not found yet - skipping module test check');
        return;
      }

      // Only check modules that actually exist in src/modules
      const existingModules = MODULES.filter((module) =>
        fs.existsSync(path.join(srcModulesPath, module)),
      );

      if (existingModules.length === 0) {
        console.warn('⚠️ No modules implemented yet - skipping unit test check');
        return;
      }

      existingModules.forEach((module) => {
        const moduleTestPath = path.join(testPath, module);
        expect(fs.existsSync(moduleTestPath)).toBe(true);

        if (!fs.existsSync(moduleTestPath)) {
          console.error(`❌ Missing unit tests for module: ${module}`);
        }
      });
    });

    it('Domain entities doivent avoir des tests unitaires purs (sans mocks)', () => {
      const testPath = path.join(__dirname, '../unit');
      if (!fs.existsSync(testPath)) return;

      MODULES.forEach((module) => {
        const domainTestPath = path.join(testPath, module, 'domain');
        if (!fs.existsSync(domainTestPath)) return;

        const testFiles = getTypeScriptFiles(domainTestPath);
        testFiles.forEach((file) => {
          const content = fs.readFileSync(file, 'utf-8');

          // Domain tests should NOT use @nestjs/testing or database mocks
          const hasNestJSTestingImport = /from\s+['"]@nestjs\/testing['"]/g.test(
            content,
          );
          const hasTypeORMMock = /(getRepository|Repository)/g.test(content);

          expect(hasNestJSTestingImport).toBe(false);
          expect(hasTypeORMMock).toBe(false);

          if (hasNestJSTestingImport || hasTypeORMMock) {
            console.error(
              `❌ Domain test ${file} should be pure unit test without framework dependencies`,
            );
          }
        });
      });
    });
  });

  describe('📋 10. Documentation', () => {
    it('Controllers doivent avoir @ApiTags() pour Swagger', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const controllerPath = path.join(srcPath, module, 'infrastructure/controllers');
        if (!fs.existsSync(controllerPath)) return;

        const controllerFiles = getTypeScriptFiles(controllerPath);
        controllerFiles.forEach((file) => {
          const content = fs.readFileSync(file, 'utf-8');

          const hasApiTags = /@ApiTags\(/g.test(content);

          if (!hasApiTags) {
            console.warn(
              `⚠️ Controller ${file} should have @ApiTags() decorator for Swagger documentation`,
            );
          }
        });
      });
    });

    it('Endpoints doivent avoir @ApiOperation() et @ApiResponse()', () => {
      const srcPath = path.join(__dirname, '../../src/modules');
      if (!fs.existsSync(srcPath)) return;

      MODULES.forEach((module) => {
        const controllerPath = path.join(srcPath, module, 'infrastructure/controllers');
        if (!fs.existsSync(controllerPath)) return;

        const controllerFiles = getTypeScriptFiles(controllerPath);
        controllerFiles.forEach((file) => {
          const content = fs.readFileSync(file, 'utf-8');

          // Find HTTP method decorators
          const httpMethods = /@(Get|Post|Put|Patch|Delete)\(/g;
          let match;

          while ((match = httpMethods.exec(content)) !== null) {
            const methodStart = match.index;
            const nextMethod = content.indexOf('@', methodStart + 1);
            const methodBlock = content.substring(
              methodStart,
              nextMethod > 0 ? nextMethod : content.length,
            );

            const hasApiOperation = /@ApiOperation\(/g.test(methodBlock);
            const hasApiResponse = /@ApiResponse\(/g.test(methodBlock);

            if (!hasApiOperation || !hasApiResponse) {
              console.warn(
                `⚠️ Endpoint in ${file} should have @ApiOperation() and @ApiResponse() decorators`,
              );
            }
          }
        });
      });
    });
  });
});

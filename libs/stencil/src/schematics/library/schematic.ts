import {
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  Rule,
  url
} from '@angular-devkit/schematics';
import {
  addProjectToNxJsonInTree,
  formatFiles,
  names,
  offsetFromRoot,
  projectRootDir,
  ProjectType,
  toFileName,
  updateWorkspace
} from '@nrwl/workspace';
import { LibrarySchema } from './schema';
import core from '../core/core';
import { CoreSchema } from '../core/schema';
import { AppType } from '../../utils/typings';
import { calculateStyle } from '../../utils/functions';

/**
 * Depending on your needs, you can change this to either `Library` or `Application`
 */
const projectType = ProjectType.Library;

function normalizeOptions(options: CoreSchema): LibrarySchema {
  const name = toFileName(options.name);
  const projectDirectory = options.directory
    ? `${toFileName(options.directory)}/${name}`
    : name;
  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-');
  const projectRoot = `${projectRootDir(projectType)}/${projectDirectory}`;
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  const style = calculateStyle(options.style);
  const appType = AppType.Library;

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
    style,
    appType
  } as LibrarySchema;
}

function addFiles(options: LibrarySchema): Rule {
  return mergeWith(
    apply(url(`./files/lib`), [
      applyTemplates({
        ...options,
        ...names(options.name),
        offsetFromRoot: offsetFromRoot(options.projectRoot)
      }),
      move(options.projectRoot),
      formatFiles({ skipFormat: false })
    ])
  );
}

export default function(options: CoreSchema): Rule {
  const normalizedOptions = normalizeOptions(options);
  return chain([
    core(normalizedOptions),
    updateWorkspace((workspace) => {
      const targetCollection = workspace.projects
        .add({
          name: normalizedOptions.projectName,
          root: normalizedOptions.projectRoot,
          sourceRoot: `${normalizedOptions.projectRoot}/src`,
          projectType
        }).targets;
      targetCollection.add({
        name: 'build',
        builder: '@nxext/stencil:build',
        options: {
          projectType
        }
      });
      targetCollection.add({
        name: 'test',
        builder: '@nxext/stencil:test',
        options: {
          projectType
        }
      });
      targetCollection.add({
        name: 'e2e',
        builder: '@nxext/stencil:e2e',
        options: {
          projectType
        }
      });
    }),
    addProjectToNxJsonInTree(normalizedOptions.projectName, {
      tags: normalizedOptions.parsedTags
    }),
    addFiles(normalizedOptions)
  ]);
}
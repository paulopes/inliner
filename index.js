#!/usr/bin/env node

const fs = require('fs');
const { inlineSource } = require('inline-source');

const argv = process.argv;

if (argv.length > 3) {
    const name = argv[2].trim();
    const path_to_file = argv[3].trim().replace(/\\/g, '/');
    const file_type = path_to_file.substr(path_to_file.lastIndexOf('.') + 1).toLowerCase();
    const class_name = file_type + '_' + name;

    var tag = '';
    var source = '';

    fs.readFile(path_to_file, 'utf8', function(err, data) {  
        if (err) {
            console.error(`Error: Unable to read the ${path_to_file} file.`);
        };

        var source = `# -*- coding: utf-8 -*-

import os


class ${class_name}:

    @staticmethod
    def make_available(path=None):
        if path:
            dest_path = '/'.join((path, '''${path_to_file}'''))
        else:
            dest_path = '''${path_to_file}'''
        if not os.path.isfile(dest_path):
            dest_folder = os.path.dirname(dest_path)

            if not os.path.exists(dest_folder):
                try:
                    os.makedirs(dest_folder)
                except OSError as e: # Guard against race condition
                    if e.errno != errno.EEXIST:
                        raise

            raw_file = r'''\\
${data}'''
            with open(dest_path, "w") as dest_file:
                dest_file.write(raw_file)
`
        switch (file_type) {
            case 'js':
                tag = '<script inline src="' + path_to_file + '"></script>';
                source += `
    @staticmethod
    def get_tag(path):
        if len(path) > 0:
            beginning = '''<script src="{}/'''.format(path)
        else:
            beginning = '<script src="'
        return beginning + '''${path_to_file}"></script>'''

    @staticmethod
    def get_dependency_path(path):
        if len(path) > 0:
            beginning = '''{}/'''.format(path)
        else:
            beginning = ''
        return beginning + '''${path_to_file.substring(0, path_to_file.length-3)}'''
`               // Remove the .js from the end because requirejs doesn't like that.
                break;
            case 'css':
                tag = '<link inline rel="stylesheet" type="text/css" href="' + path_to_file + '"></link>';
                source += `
    @staticmethod
    def get_tag(path):
        if len(path) > 0:
            beginning = '''<link rel="stylesheet" type="text/css" href="{}/'''.format(path)
        else:
            beginning = '<link rel="stylesheet" type="text/css" href="'
        return beginning + '''${path_to_file}"></link>'''
`
                break;
        };

        if (tag.length > 0) {
            inlineSource(tag, {compress: false})
            .then(function(html) {
                source += `
    @staticmethod
    def get_inline():
        return r'''${html}
'''
`
                fs.writeFile(class_name + '.py', source, 'utf8', function(err) {
                    if (err) {
                        console.error(`Error: Unable to write to ${class_name}.py file.`);
                    } else {
                        process.stdout.write(`The ${class_name}.py file has been created.`);
                    };
                });
            })
            .catch(function(err) {
                console.error("Error: Unable to parse source file.")
            });
        } else {
            console.error(`Error: The ${file_type} file type is not supported.`);
        } 
    });
} else {
    process.stdout.write(`
    Usage:
        inliner <name for the .js or .css resource> <path to the .js or .css resource>
    `)
}

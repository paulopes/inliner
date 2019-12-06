#!/usr/bin/env node

const fs = require('fs')
const { inlineSource } = require('inline-source')

const argv = process.argv

if (argv.length > 3) {
    const name = argv[2]
    const path_to_file = argv[3].replace(/\\/g, '/')
    const file_type = path_to_file
        .substr(path_to_file.lastIndexOf('.') + 1)
        .toLowerCase()
    const class_name = file_type + '_' + name
    let cdn_url_path = ''
    if (argv.length > 4) {
        cdn_url_path = argv[4]
    }

    var tag = ''
    var source = ''

    if (file_type == 'png' || file_type == 'jpg' || file_type == 'jpeg') {
        encoding = null
    } else {
        encoding = 'utf8'
    }

    fs.readFile(path_to_file, encoding, function(err, data) {
        if (err) {
            console.error(
                `Error: Unable to read the ${path_to_file} file. ${err.message}`,
            )
            process.exit(2)
        }

        source += `# -*- coding: utf-8 -*-

import os
import errno`
        if (file_type == 'png' || file_type == 'jpg' || file_type == 'jpeg') {
            source += `
import base64`
        }

        source += `


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
`
        switch (file_type) {
            case 'js':
                tag = '<script inline src="' + path_to_file + '"></script>'
                source += `
            raw_file = r'''\\
${data}'''
            with open(dest_path, "w") as dest_file:
                dest_file.write(raw_file)
            
    @staticmethod
    def get_tag(path):
        if len(path) > 0:
            beginning = '''<script src="{}/'''.format(path)
        else:
            beginning = '<script src="'
        return beginning + '''${path_to_file}"></script>'''

    @staticmethod
    def get_tag_cdn():
        return '''<script crossorigin="anonymous" src="${cdn_url_path}"></script>'''
    
    @staticmethod
    def get_dependency_path(path):
        if len(path) > 0:
            beginning = '''{}/'''.format(path)
        else:
            beginning = ''
        return beginning + '''${path_to_file.substring(
            0,
            path_to_file.length - 3, // Remove the .js from the end because requirejs doesn't like that.
        )}'''

    @staticmethod
    def get_dependency_path_cdn():
        return '''${cdn_url_path.substring(
            0,
            cdn_url_path.length - 3, // Remove the .js from the end because requirejs doesn't like that.
        )}'''
`
                break
            case 'css':
                tag =
                    '<link inline rel="stylesheet" type="text/css" href="' +
                    path_to_file +
                    '"></link>'
                source += `
            raw_file = r'''\\
${data}'''
            with open(dest_path, "w") as dest_file:
                dest_file.write(raw_file)
    
    @staticmethod
    def get_tag(path):
        if len(path) > 0:
            beginning = '''<link rel="stylesheet" type="text/css" href="{}/'''.format(path)
        else:
            beginning = '<link rel="stylesheet" type="text/css" href="'
        return beginning + '''${path_to_file}"></link>'''
    
    @staticmethod
    def get_tag_cdn():
        return '''<link rel="stylesheet" type="text/css" href="${cdn_url_path}"></link>'''
`
                break
            case 'svg':
                tag = '<img inline src="' + path_to_file + '"></img>'
                source += `
            raw_file = r'''\\
${data}'''
            with open(dest_path, "w") as dest_file:
                dest_file.write(raw_file)

    @staticmethod
    def get_tag(path):
        if len(path) > 0:
            beginning = '''<img src="{}/'''.format(path)
        else:
            beginning = '<img src="'
        return beginning + '''${path_to_file}" />'''
`
                break
            case 'png':
            case 'jpg':
            case 'jpeg':
                tag = '<img inline src="' + path_to_file + '"></img>'
                source += `
            b64_file = r'''\\
${Buffer.from(data).toString('base64')}'''
            with open(dest_path, "wb") as dest_file:
                dest_file.write(base64.b64decode(b64_file).decode('utf-8'))
    
    @staticmethod
    def get_tag_cdn():
        return '''<img src="${cdn_url_path}" />'''
            
    @staticmethod
    def get_tag(path):
        if len(path) > 0:
            beginning = '''<img src="{}/'''.format(path)
        else:
            beginning = '<img src="'
        return beginning + '''${path_to_file}" />'''
`
                break
        }

        if (tag.length > 0) {
            inlineSource(tag, { compress: false })
                .then(function(html) {
                    source += `
    @staticmethod
    def get_inline():
        return r'''${html}
'''
`
                    fs.writeFile(class_name + '.py', source, 'utf8', function(
                        err,
                    ) {
                        if (err) {
                            console.error(
                                `Error: Unable to write to ${class_name}.py file.`,
                            )
                            process.exit(3)
                        } else {
                            process.stdout
                                .write(`The ${class_name}.py file has been created.
`)
                        }
                    })
                })
                .catch(function(err) {
                    console.error('Error: Unable to parse source file.')
                    process.exit(4)
                })
        } else {
            console.error(`Error: The ${file_type} file type is not supported.`)
            process.exit(4)
        }
    })
} else {
    process.stdout.write(`
    Usage:
        inliner <name for the .js or .css resource> <path to the .js or .css resource> [<url where from to download the file>]

`)
}

#!/bin/bash

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 --input <archivo_csv> --output <archivo_json> --locale <idioma>"
    echo "Ejemplo: $0 --input column_names.csv --output fr.json --locale fr"
}

# Función para validar argumentos
validate_args() {
    if [ "$#" -ne 6 ]; then
        show_help
        exit 1
    fi
}

# Función para leer argumentos
read_args() {
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --input) input_file="$2"; shift ;;
            --output) output_file="$2"; shift ;;
            --locale) locale="$2"; shift ;;
            *) show_help; exit 1 ;;
        esac
        shift
    done
}

# Función para validar que el archivo de entrada existe
validate_input_file() {
    if [ ! -f "$input_file" ]; then
        echo "Error: El archivo de entrada '$input_file' no existe."
        exit 1
    fi
}

# Función para leer las líneas en blanco del archivo JSON de salida
read_blank_lines() {
    blank_lines=()
    if [ -f "$output_file" ]; then
        json_output=$(cat "$output_file")
        line_number=0
        while IFS= read -r line; do
            if [[ -z "$line" ]]; then
                blank_lines+=($line_number)
            fi
            ((line_number++))
        done < "$output_file"
    else
        json_output="{}"
    fi
}

# Función para leer el encabezado del archivo CSV
read_csv_header() {
    IFS=, read -r -a headers < "$input_file"
}

# Función para encontrar los índices de las columnas correspondientes
find_column_indices() {
    key_column_index=0
    value_column_index=-1
    for i in "${!headers[@]}"; do
        if [[ "${headers[$i]}" == *"_$locale" ]]; then
            value_column_index=$i
            break
        fi
    done

    if [ $value_column_index -eq -1 ]; then
        echo "Error: No se encontró una columna para el idioma '$locale'."
        exit 1
    fi
}

# Función para actualizar el JSON con los datos del CSV
update_json() {
    while IFS=, read -r -a line; do
        key="${line[$key_column_index]}"
        value="${line[$value_column_index]}"
        json_output=$(echo "$json_output" | jq --arg key "$key" --arg value "$value" '.[$key] = $value')
    done < <(tail -n +2 "$input_file")
}

# Función para insertar las líneas en blanco en las posiciones originales
insert_blank_lines() {
    temp_file_with_blanks=$(mktemp)
    line_number=0
    blank_line_count=0
    while IFS= read -r line; do
        if [[ " ${blank_lines[@]} " =~ " $((line_number + blank_line_count)) " ]]; then
            echo "" >> "$temp_file_with_blanks"
            ((blank_line_count++))
        fi
        echo "$line" >> "$temp_file_with_blanks"
        ((line_number++))
    done < "$temp_file"
}

# Función principal
main() {
    validate_args "$@"
    read_args "$@"
    validate_input_file
    read_blank_lines
    read_csv_header
    find_column_indices
    temp_file=$(mktemp)
    update_json
    echo "$json_output" | jq . > "$temp_file"
    insert_blank_lines
    mv "$temp_file_with_blanks" "$output_file"
    echo "Traducciones guardadas en '$output_file'."
}

# Ejecutar la función principal
main "$@"
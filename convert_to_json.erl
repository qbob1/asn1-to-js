-module(convert_to_json).
-export([main/0]).

main() ->
    {ok, Tab} = ets:file2tab("./profile.asn1db"),
    List = ets:tab2list(Tab),

    % Convert to a more JSON-friendly format
    JsonData = lists:map(fun convert_entry/1, List),

    % Write to JSON file
    JsonStr = format_json(JsonData),
    file:write_file("asn1_definitions.json", JsonStr),

    io:format("Converted ~p entries to JSON~n", [length(JsonData)]),
    halt().

convert_entry({Name, {typedef, Checked, Line, TypeName, TypeDef}}) ->
    #{
        name => atom_to_binary(Name, utf8),
        kind => <<"typedef">>,
        checked => Checked,
        line => Line,
        type_name => atom_to_binary(TypeName, utf8),
        definition => convert_type(TypeDef)
    };
convert_entry({Name, {valuedef, Checked, Line, ValueName, TypeDef, Value, Module}}) ->
    #{
        name => atom_to_binary(Name, utf8),
        kind => <<"valuedef">>,
        checked => Checked,
        line => Line,
        value_name => atom_to_binary(ValueName, utf8),
        type => convert_type(TypeDef),
        value => Value,
        module => atom_to_binary(Module, utf8)
    };
convert_entry(Other) ->
    #{raw => list_to_binary(io_lib:format("~p", [Other]))}.

convert_type({type, Tags, TypeDef, Constraints, _, _}) ->
    #{
        tags => convert_tags(Tags),
        type_def => convert_type_def(TypeDef),
        constraints => convert_constraints(Constraints)
    };
convert_type(Other) ->
    #{raw => list_to_binary(io_lib:format("~p", [Other]))}.

convert_tags(Tags) ->
    lists:map(fun({tag, Class, Number, TagType, Form}) ->
        #{
            class => atom_to_binary(Class, utf8),
            number => Number,
            tag_type => atom_to_binary(TagType, utf8),
            form => Form
        }
    end, Tags).

convert_type_def({'SEQUENCE', _Ext1, _Ext2, _Ext3, Components}) when is_list(Components) ->
    #{
        type => <<"SEQUENCE">>,
        components => lists:map(fun convert_component/1, Components)
    };
convert_type_def({'SEQUENCE', _Ext1, _Ext2, _Ext3, {Components, _Ext4}}) when is_list(Components) ->
    #{
        type => <<"SEQUENCE">>,
        components => lists:map(fun convert_component/1, Components)
    };
convert_type_def({'SEQUENCE', _Ext1, _Ext2, _Ext3, {Components, _Ext4}}) when is_tuple(Components) ->
    % Handle case where Components is {[...], [...]}
    {CompList, _} = Components,
    #{
        type => <<"SEQUENCE">>,
        components => lists:map(fun convert_component/1, CompList)
    };
convert_type_def({'CHOICE', Components}) when is_list(Components) ->
    #{
        type => <<"CHOICE">>,
        alternatives => lists:map(fun convert_component/1, Components)
    };
convert_type_def({'CHOICE', {Components, _}}) when is_list(Components) ->
    #{
        type => <<"CHOICE">>,
        alternatives => lists:map(fun convert_component/1, Components)
    };
convert_type_def({'Externaltypereference', Line, Module, TypeName}) ->
    #{
        type => <<"reference">>,
        module => atom_to_binary(Module, utf8),
        type_name => atom_to_binary(TypeName, utf8),
        line => Line
    };
convert_type_def({'BIT STRING', NamedBits}) ->
    #{
        type => <<"BIT STRING">>,
        named_bits => lists:map(fun convert_named_bit/1, NamedBits)
    };
convert_type_def(TypeName) when is_atom(TypeName) ->
    #{type => atom_to_binary(TypeName, utf8)};
convert_type_def(Other) ->
    #{raw => list_to_binary(io_lib:format("~p", [Other]))}.

convert_component({'ComponentType', Line, Name, TypeDef, Default, Tags, Pos}) ->
    #{
        component_type => <<"ComponentType">>,
        line => Line,
        name => atom_to_binary(Name, utf8),
        type => convert_type(TypeDef),
        default => convert_default(Default),
        tags => convert_component_tags(Tags),
        position => Pos
    };
convert_component(Other) ->
    #{raw => list_to_binary(io_lib:format("~p", [Other]))}.

convert_component_tags(undefined) -> null;
convert_component_tags(Tags) when is_list(Tags) ->
    lists:map(fun({Class, Number}) ->
        #{
            class => atom_to_binary(Class, utf8),
            number => Number
        }
    end, Tags);
convert_component_tags(Other) ->
    #{raw => list_to_binary(io_lib:format("~p", [Other]))}.

convert_default('OPTIONAL') -> <<"OPTIONAL">>;
convert_default(mandatory) -> <<"mandatory">>;
convert_default({'DEFAULT', Value}) when is_binary(Value) ->
    #{default => base64:encode(Value)};
convert_default({'DEFAULT', Value}) ->
    #{default => Value};
convert_default(Other) ->
    #{raw => list_to_binary(io_lib:format("~p", [Other]))}.

convert_constraints(Constraints) ->
    lists:map(fun
        ({'SizeConstraint', {Min, Max}}) ->
            #{
                type => <<"size">>,
                min => Min,
                max => Max
            };
        ({'SizeConstraint', Size}) ->
            #{
                type => <<"size">>,
                value => Size
            };
        ({'ValueRange', {Min, Max}}) ->
            #{
                type => <<"range">>,
                min => Min,
                max => Max
            };
        (Other) ->
            #{raw => list_to_binary(io_lib:format("~p", [Other]))}
    end, Constraints).

convert_named_bit({Name, Value}) ->
    #{
        name => atom_to_binary(Name, utf8),
        value => Value
    };
convert_named_bit(Other) ->
    #{raw => list_to_binary(io_lib:format("~p", [Other]))}.

format_json(Data) ->
    list_to_binary(encode_json(Data)).

encode_json(Map) when is_map(Map) ->
    Pairs = maps:fold(fun(K, V, Acc) ->
        Key = encode_json_key(K),
        Value = encode_json(V),
        [lists:flatten(io_lib:format("~s:~s", [Key, Value])) | Acc]
    end, [], Map),
    ["{", lists:flatten(lists:join(",", Pairs)), "}"];
encode_json(List) when is_list(List) ->
    case io_lib:printable_list(List) of
        true ->
            % It's a string
            ["\"", escape_string(List), "\""];
        false ->
            % It's a list
            Elements = [encode_json(E) || E <- List],
            ["[", lists:flatten(lists:join(",", Elements)), "]"]
    end;
encode_json(Binary) when is_binary(Binary) ->
    ["\"", escape_string(binary_to_list(Binary)), "\""];
encode_json(Atom) when is_atom(Atom) ->
    case Atom of
        true -> "true";
        false -> "false";
        null -> "null";
        undefined -> "null";
        _ -> ["\"", escape_string(atom_to_list(Atom)), "\""]
    end;
encode_json(Number) when is_number(Number) ->
    io_lib:format("~p", [Number]);
encode_json(_Other) ->
    "null".

encode_json_key(Key) when is_atom(Key) ->
    ["\"", escape_string(atom_to_list(Key)), "\""];
encode_json_key(Key) when is_binary(Key) ->
    ["\"", escape_string(binary_to_list(Key)), "\""];
encode_json_key(Key) ->
    ["\"", escape_string(io_lib:format("~p", [Key])), "\""].

escape_string(String) ->
    lists:flatmap(fun
        ($") -> "\\\"";
        ($\\) -> "\\\\";
        ($\n) -> "\\n";
        ($\r) -> "\\r";
        ($\t) -> "\\t";
        (C) when C < 32 -> io_lib:format("\\u~4.16.0B", [C]);
        (C) -> [C]
    end, lists:flatten(String)).
